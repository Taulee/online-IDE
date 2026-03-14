import React, { useState, useCallback } from 'react';
import CodeEditor from './components/CodeEditor';
import OutputTerminal from './components/OutputTerminal';
import FileManager from './components/FileManager';
import LanguageSelector from './components/LanguageSelector';
import { executeCode, saveFile, getFile } from './services/api';
import './styles/App.css';

const DEFAULT_CODE = {
  python: `# Python Example
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
print("Welcome to Online IDE!")
`,
  cpp: `// C++ Example
#include <iostream>
#include <string>

std::string greet(const std::string& name) {
    return "Hello, " + name + "!";
}

int main() {
    std::cout << greet("World") << std::endl;
    std::cout << "Welcome to Online IDE!" << std::endl;
    return 0;
}
`,
  nodejs: `// Node.js Example
function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet("World"));
console.log("Welcome to Online IDE!");
`
};

function App() {
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [stdin, setStdin] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [showFileManager, setShowFileManager] = useState(false);

  const handleLanguageChange = useCallback((newLanguage) => {
    setLanguage(newLanguage);
    if (!currentFile) {
      setCode(DEFAULT_CODE[newLanguage]);
    }
  }, [currentFile]);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutput('Running...\n');

    try {
      const result = await executeCode(code, language, stdin);
      
      let outputText = '';
      if (result.output) {
        outputText += result.output;
      }
      if (result.error) {
        outputText += '\n[Error]\n' + result.error;
      }
      if (!result.success && result.exitCode !== undefined) {
        outputText += `\n[Exit Code: ${result.exitCode}]`;
      }
      
      setOutput(outputText || 'Program completed with no output.');
    } catch (error) {
      setOutput(`[Error] ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [code, language, stdin]);

  const handleSave = useCallback(async () => {
    const fileName = prompt('Enter file name:', currentFile?.name || `main.${getExtension(language)}`);
    if (!fileName) return;

    try {
      const savedFile = await saveFile({
        id: currentFile?._id,
        name: fileName,
        content: code,
        language
      });
      setCurrentFile(savedFile);
      setOutput(`File saved: ${fileName}`);
    } catch (error) {
      setOutput(`[Error] Failed to save: ${error.message}`);
    }
  }, [code, language, currentFile]);

  const handleFileSelect = useCallback(async (file) => {
    try {
      const loadedFile = await getFile(file._id);
      setCode(loadedFile.content);
      setLanguage(loadedFile.language);
      setCurrentFile(loadedFile);
      setShowFileManager(false);
    } catch (error) {
      setOutput(`[Error] Failed to load file: ${error.message}`);
    }
  }, []);

  const handleNewFile = useCallback(() => {
    setCurrentFile(null);
    setCode(DEFAULT_CODE[language]);
    setOutput('');
  }, [language]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">CodeAnywhere</h1>
          
          <span className="file-name">
            {currentFile ? currentFile.name : 'Untitled'}
          </span>
        </div>
       
        <div className="header-center">
          <LanguageSelector 
            language={language} 
            onChange={handleLanguageChange} 
          />
        </div>
        <div className="header-right">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowFileManager(!showFileManager)}
          >
            Files
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleNewFile}
          >
            New
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleSave}
          >
            Save
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleRun}
            disabled={isRunning}
          >
            {isRunning ? 'Running...' : '▶ Run'}
          </button>
        </div>
      </header>
<div style={{
  margin:'auto',
  padding:'10px',
  fontWeight:'bold',
}}>
  <p>Yet another online code editor</p>
  </div>
  
      <main className="main">
        {showFileManager && (
          <FileManager 
            onSelect={handleFileSelect}
            onClose={() => setShowFileManager(false)}
          />
        )}
        <div className="editor-container">
          <CodeEditor 
            code={code} 
            language={language} 
            onChange={setCode} 
          />
        </div>
        <div className="output-container">
          <div className="stdin-section">
            <div className="stdin-header">Input (stdin)</div>
            <textarea
              className="stdin-input"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Enter input values here (one per line)..."
            />
          </div>
          <OutputTerminal output={output} />
        </div>
      </main>
    </div>
  );
}

function getExtension(language) {
  const extensions = {
    python: 'py',
    cpp: 'cpp',
    nodejs: 'js'
  };
  return extensions[language] || 'txt';
}

export default App;
