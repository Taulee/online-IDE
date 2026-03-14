const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const LANGUAGE_CONFIG = {
  python: {
    image: 'online-ide-python',
    extension: '.py',
    command: (filename) => ['sh', '-c', `python3 ${filename} < /code/stdin.txt`]
  },
  cpp: {
    image: 'online-ide-cpp',
    extension: '.cpp',
    command: (filename) => ['sh', '-c', `g++ -o /tmp/output ${filename} && /tmp/output < /code/stdin.txt`]
  },
  nodejs: {
    image: 'online-ide-nodejs',
    extension: '.js',
    command: (filename) => ['sh', '-c', `node ${filename} < /code/stdin.txt`]
  }
};

const EXECUTION_TIMEOUT = 30000; // 30 seconds
const MEMORY_LIMIT = 128 * 1024 * 1024; // 128MB

async function executeCode(code, language, stdin = '') {
  const config = LANGUAGE_CONFIG[language];
  
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const executionId = uuidv4();
  const tempDir = path.join(os.tmpdir(), 'online-ide', executionId);
  const filename = `main${config.extension}`;
  const filepath = path.join(tempDir, filename);
  const stdinPath = path.join(tempDir, 'stdin.txt');

  try {
    // Create temp directory and write code + stdin
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(filepath, code);
    await fs.writeFile(stdinPath, stdin);

    // Create container
    const container = await docker.createContainer({
      Image: config.image,
      Cmd: config.command(filename),
      WorkingDir: '/code',
      HostConfig: {
        Binds: [`${tempDir}:/code:ro`],
        Memory: MEMORY_LIMIT,
        MemorySwap: MEMORY_LIMIT,
        NetworkMode: 'none',
        AutoRemove: true,
        ReadonlyRootfs: false,
        SecurityOpt: ['no-new-privileges:true']
      },
      User: 'runner'
    });

    // Start container
    await container.start();

    // Wait for completion with timeout
    const result = await Promise.race([
      container.wait(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Execution timeout')), EXECUTION_TIMEOUT)
      )
    ]);

    // Get logs
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      follow: false
    });

    // Parse logs (remove Docker stream headers)
    const output = parseDockerLogs(logs);

    return {
      success: result.StatusCode === 0,
      output: output.stdout,
      error: output.stderr,
      exitCode: result.StatusCode,
      executionId
    };

  } catch (error) {
    // Try to stop container if timeout
    if (error.message === 'Execution timeout') {
      try {
        const containers = await docker.listContainers();
        // Container should auto-remove, but try to kill any stuck ones
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    return {
      success: false,
      output: '',
      error: "Server error please run again",
      exitCode: -1,
      executionId
    };

  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

function parseDockerLogs(buffer) {
  let stdout = '';
  let stderr = '';
  let offset = 0;

  while (offset < buffer.length) {
    // Docker multiplexed stream format
    if (offset + 8 > buffer.length) break;
    
    const streamType = buffer[offset];
    const size = buffer.readUInt32BE(offset + 4);
    
    if (offset + 8 + size > buffer.length) break;
    
    const content = buffer.slice(offset + 8, offset + 8 + size).toString('utf8');
    
    if (streamType === 1) {
      stdout += content;
    } else if (streamType === 2) {
      stderr += content;
    }
    
    offset += 8 + size;
  }

  // If parsing fails, treat entire buffer as stdout
  if (!stdout && !stderr && buffer.length > 0) {
    stdout = buffer.toString('utf8');
  }

  return { stdout, stderr };
}

module.exports = { executeCode };
