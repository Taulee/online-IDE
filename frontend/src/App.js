import React, { useCallback, useEffect, useState } from 'react';
import CodeEditor from './components/CodeEditor';
import OutputTerminal from './components/OutputTerminal';
import FileManager from './components/FileManager';
import LanguageSelector from './components/LanguageSelector';
import LoginForm from './components/LoginForm';
import SubmitCodeModal from './components/SubmitCodeModal';
import SubmissionPanel from './components/SubmissionPanel';
import UserManagement from './components/UserManagement';
import {
  clearToken,
  executeCode,
  getCurrentUser,
  getFile,
  hasToken,
  saveFile
} from './services/api';
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
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [stdin, setStdin] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [showFileManager, setShowFileManager] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showSubmissionPanel, setShowSubmissionPanel] = useState(false);
  const [submissionPanelMode, setSubmissionPanelMode] = useState('student');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [fileRefreshKey, setFileRefreshKey] = useState(0);

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!hasToken()) {
        setAuthLoading(false);
        return;
      }

      try {
        const data = await getCurrentUser();
        setUser(data.user);
      } catch (error) {
        clearToken();
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    loadCurrentUser();
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setCode(DEFAULT_CODE.python);
    setLanguage('python');
    setCurrentFile(null);
    setOutput('');
    setStdin('');
    setShowFileManager(false);
    setShowUserManagement(false);
    setShowSubmissionPanel(false);
    setShowSubmitModal(false);
  }, []);

  const handleLanguageChange = useCallback((newLanguage) => {
    setLanguage(newLanguage);
    if (!currentFile) {
      setCode(DEFAULT_CODE[newLanguage]);
    }
  }, [currentFile]);

  const handleRun = useCallback(async () => {
    if (!user?.permissions?.canRunCode) {
      setOutput('[Error] 当前账号没有运行代码权限');
      return;
    }

    setIsRunning(true);
    setOutput('Running...\n');

    try {
      const result = await executeCode(code, language, stdin);
      let outputText = '';

      if (result.output) outputText += result.output;
      if (result.error) outputText += `\n[Error]\n${result.error}`;
      if (!result.success && result.exitCode !== undefined) {
        outputText += `\n[Exit Code: ${result.exitCode}]`;
      }

      setOutput(outputText || 'Program completed with no output.');
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        return;
      }
      setOutput(`[Error] ${error.response?.data?.error || error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [code, language, logout, stdin, user]);

  const handleSave = useCallback(async () => {
    if (!user?.permissions?.canSaveFiles) {
      setOutput('[Error] 当前账号没有保存文件权限');
      return;
    }

    const fileName = prompt('Enter file name:', currentFile?.name || `main.${getExtension(language)}`);
    if (!fileName) return;

    try {
      const response = await saveFile({
        id: currentFile?._id,
        name: fileName,
        content: code,
        language
      });
      const savedFile = response.file || response;
      setCurrentFile(savedFile);
      setFileRefreshKey((v) => v + 1);
      setOutput(`File saved: ${savedFile.name}`);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        return;
      }
      setOutput(`[Error] Failed to save: ${error.response?.data?.error || error.message}`);
    }
  }, [code, language, currentFile, logout, user]);

  const handleFileSelect = useCallback(async (file) => {
    try {
      const response = await getFile(file._id);
      const loadedFile = response.file || response;
      setCode(loadedFile.content);
      setLanguage(loadedFile.language);
      setCurrentFile(loadedFile);
      setShowFileManager(false);
    } catch (error) {
      setOutput(`[Error] Failed to load file: ${error.response?.data?.error || error.message}`);
    }
  }, []);

  const handleNewFile = useCallback(() => {
    setCurrentFile(null);
    setCode(DEFAULT_CODE[language]);
    setOutput('');
  }, [language]);

  const handleLoadSubmission = useCallback((submission) => {
    setCode(submission.content || '');
    setLanguage(submission.language || 'python');
    setCurrentFile({
      _id: null,
      name: submission.submittedFileName
    });
    setShowSubmissionPanel(false);
    setOutput(`已载入学生提交：${submission.submittedFileName}`);
  }, []);

  if (authLoading) {
    return <div className="loading-page">Checking session...</div>;
  }

  if (!user) {
    return <LoginForm onLoginSuccess={setUser} />;
  }

  const canManageUsers = Boolean(user.permissions?.canManageUsers);
  const canReviewSubmissions = Boolean(user.permissions?.canReviewSubmissions);
  const canSaveFiles = Boolean(user.permissions?.canSaveFiles);
  const canSubmitCode = Boolean(user.permissions?.canSubmitCode && user.role === 'student');

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">CodeAnywhere</h1>
          <span className="file-name">{currentFile ? currentFile.name : 'Untitled'}</span>
        </div>

        <div className="header-center">
          <LanguageSelector language={language} onChange={handleLanguageChange} />
        </div>

        <div className="header-right">
          {canManageUsers && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowUserManagement(true);
                setShowFileManager(false);
                setShowSubmissionPanel(false);
              }}
            >
              用户管理
            </button>
          )}

          {canReviewSubmissions && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSubmissionPanelMode('teacher');
                setShowSubmissionPanel(true);
                setShowFileManager(false);
                setShowUserManagement(false);
              }}
            >
              学生提交
            </button>
          )}

          {canSubmitCode && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSubmissionPanelMode('student');
                setShowSubmissionPanel(true);
                setShowFileManager(false);
                setShowUserManagement(false);
              }}
            >
              我的提交
            </button>
          )}

          {canSaveFiles && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowFileManager(!showFileManager);
                setShowUserManagement(false);
                setShowSubmissionPanel(false);
              }}
            >
              Files
            </button>
          )}

          {canSaveFiles && (
            <button className="btn btn-secondary" onClick={handleNewFile}>
              New
            </button>
          )}

          {canSaveFiles && (
            <button className="btn btn-secondary" onClick={handleSave}>
              Save
            </button>
          )}

          {canSubmitCode && (
            <button className="btn btn-secondary" onClick={() => setShowSubmitModal(true)}>
              提交给老师
            </button>
          )}

          <button className="btn btn-primary" onClick={handleRun} disabled={isRunning || !user.permissions?.canRunCode}>
            {isRunning ? 'Running...' : '▶ Run'}
          </button>

          <button className="btn btn-secondary" onClick={logout}>
            退出 ({user.username})
          </button>
        </div>
      </header>

      <main className="main">
        {showFileManager && (
          <FileManager
            onSelect={handleFileSelect}
            onClose={() => setShowFileManager(false)}
            canDelete={canSaveFiles}
            refreshKey={fileRefreshKey}
          />
        )}

        {showUserManagement && canManageUsers && (
          <UserManagement currentUser={user} onClose={() => setShowUserManagement(false)} />
        )}

        {showSubmissionPanel && (
          <SubmissionPanel
            mode={submissionPanelMode}
            onClose={() => setShowSubmissionPanel(false)}
            onLoadCode={handleLoadSubmission}
          />
        )}

        <div className="editor-container">
          <CodeEditor code={code} language={language} onChange={setCode} />
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

      <SubmitCodeModal
        open={showSubmitModal}
        code={code}
        language={language}
        defaultFileName={currentFile?.name || `main.${getExtension(language)}`}
        onClose={() => setShowSubmitModal(false)}
        onSuccess={() => setOutput('代码已提交给老师')}
      />
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
