const Docker = require("dockerode");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const LANGUAGE_CONFIG = {
    python: {
        image: "online-ide-python",
        extension: ".py",
        command: (filename) => [
            "sh",
            "-c",
            `python3 ${filename} < /code/stdin.txt`,
        ],
    },
    cpp: {
        image: "online-ide-cpp",
        extension: ".cpp",
        command: (filename) => [
            "sh",
            "-c",
            `g++ -o /tmp/output ${filename} && /tmp/output < /code/stdin.txt`,
        ],
    },
    nodejs: {
        image: "online-ide-nodejs",
        extension: ".js",
        command: (filename) => [
            "sh",
            "-c",
            `node ${filename} < /code/stdin.txt`,
        ],
    },
};

const EXECUTION_TIMEOUT = 30000; // 30 秒
const MEMORY_LIMIT = 128 * 1024 * 1024; // 128MB

async function executeCode(code, language, stdin = "") {
    const config = LANGUAGE_CONFIG[language];

    if (!config) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const executionId = uuidv4();
    const tempDir = path.join(os.tmpdir(), "online-ide", executionId);
    const filename = `main${config.extension}`;
    const filepath = path.join(tempDir, filename);
    const stdinPath = path.join(tempDir, "stdin.txt");
    let container = null;

    try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(filepath, code);
        await fs.writeFile(stdinPath, stdin);

        container = await docker.createContainer({
            Image: config.image,
            Cmd: config.command(filename),
            WorkingDir: "/code",
            HostConfig: {
                Binds: [`${tempDir}:/code:ro`],
                Memory: MEMORY_LIMIT,
                MemorySwap: MEMORY_LIMIT,
                NetworkMode: "none",
                AutoRemove: false,
                ReadonlyRootfs: false,
                SecurityOpt: ["no-new-privileges:true"],
            },
            User: "runner",
        });

        await container.start();

        const result = await Promise.race([
            container.wait(),
            new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error("Execution timeout")),
                    EXECUTION_TIMEOUT,
                ),
            ),
        ]);

        const logs = await container.logs({
            stdout: true,
            stderr: true,
            follow: false,
        });

        // 转文字流为json
        const output = parseDockerLogs(logs);

        return {
            success: result.StatusCode === 0,
            output: output.stdout,
            error: output.stderr,
            exitCode: result.StatusCode,
            executionId,
        };
    } catch (error) {
        console.error(`[execute:${executionId}]`, error);

        if (error.message === "Execution timeout") {
            await stopContainer(container);
            return {
                success: false,
                output: "",
                error: `代码执行超时（>${EXECUTION_TIMEOUT / 1000} 秒）`,
                exitCode: 124,
                executionId,
            };
        }

        const friendlyError = mapExecutionError(error, config.image);

        return {
            success: false,
            output: "",
            error: friendlyError,
            exitCode: -1,
            executionId,
        };
    } finally {
        await removeContainer(container);

        // 清理临时目录
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (e) {
            // 忽略清理失败
        }
    }
}

function mapExecutionError(error, imageName) {
    const message = `${error?.message || ""} ${error?.reason || ""}`;
    if (error?.statusCode === 404 || /No such image/i.test(message)) {
        return `运行环境镜像不存在：${imageName}。请先执行 docker compose build。`;
    }
    if (/No such container/i.test(message)) {
        return "执行容器意外丢失，请重试。";
    }
    return "服务器执行异常，请重试。";
}

async function stopContainer(container) {
    if (!container) return;
    try {
        await container.kill();
    } catch (error) {
        if (error?.statusCode !== 409 && error?.statusCode !== 404) {
            console.error("Failed to kill container:", error.message || error);
        }
    }
}

async function removeContainer(container) {
    if (!container) return;
    try {
        await container.remove({ force: true });
    } catch (error) {
        if (error?.statusCode !== 404) {
            console.error(
                "Failed to remove container:",
                error.message || error,
            );
        }
    }
}

function parseDockerLogs(buffer) {
    if (!buffer) {
        return { stdout: "", stderr: "" };
    }

    if (!Buffer.isBuffer(buffer)) {
        const text = buffer.toString("utf8");
        return { stdout: text, stderr: "" };
    }

    let stdout = "";
    let stderr = "";
    let offset = 0;

    while (offset < buffer.length) {
        // Docker 多路复用流格式
        if (offset + 8 > buffer.length) break;

        const streamType = buffer[offset];
        const size = buffer.readUInt32BE(offset + 4);

        if (offset + 8 + size > buffer.length) break;

        const content = buffer
            .slice(offset + 8, offset + 8 + size)
            .toString("utf8");

        if (streamType === 1) {
            stdout += content;
        } else if (streamType === 2) {
            stderr += content;
        }

        offset += 8 + size;
    }

    // 如果解析失败，将整个缓冲区视为标准输出
    if (!stdout && !stderr && buffer.length > 0) {
        stdout = buffer.toString("utf8");
    }

    return { stdout, stderr };
}

module.exports = { executeCode };
