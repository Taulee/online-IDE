import React, { useCallback, useEffect, useState } from 'react';
import CodeEditor from './components/CodeEditor';
import OutputTerminal from './components/OutputTerminal';
import FileManager from './components/FileManager';
import LanguageSelector from './components/LanguageSelector';
import LoginForm from './components/LoginForm';
import SubmitCodeModal from './components/SubmitCodeModal';
import SubmissionPanel from './components/SubmissionPanel';
import UserManagement from './components/UserManagement';
import AiSettingsModal from './components/AiSettingsModal';
import AiGuidanceModal from './components/AiGuidanceModal';
import {
  clearToken,
  executeCode,
  generateAiGuidance,
  getCurrentUser,
  getFile,
  hasToken,
  saveFile
} from './services/api';
import './styles/App.css';

const DEFAULT_CODE = {
  python: `# Python 示例
def greet(name):
    return f"你好, {name}!"

print(greet("世界"))
print("欢迎使用在线 IDE！")
`,
  cpp: `// C++ 示例
#include <iostream>
#include <string>

std::string greet(const std::string& name) {
    return "你好, " + name + "!";
}

int main() {
    std::cout << greet("世界") << std::endl;
    std::cout << "欢迎使用在线 IDE！" << std::endl;
    return 0;
}
`,
  nodejs: `// Node.js 示例
function greet(name) {
    return \`你好, \${name}!\`;
}

console.log(greet("世界"));
console.log("欢迎使用在线 IDE！");
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
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [showSubmissionPanel, setShowSubmissionPanel] = useState(false);
  const [submissionPanelMode, setSubmissionPanelMode] = useState('student');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAiGuidanceModal, setShowAiGuidanceModal] = useState(false);
  const [aiGuidanceLoading, setAiGuidanceLoading] = useState(false);
  const [aiGuidance, setAiGuidance] = useState('');
  const [aiGuidanceError, setAiGuidanceError] = useState('');
  const [lastFailedExecution, setLastFailedExecution] = useState(null);
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
    setShowAiSettings(false);
    setShowSubmissionPanel(false);
    setShowSubmitModal(false);
    setShowAiGuidanceModal(false);
    setAiGuidance('');
    setAiGuidanceError('');
    setLastFailedExecution(null);
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
    setOutput('运行中...\n');
    setLastFailedExecution(null);
    setAiGuidance('');
    setAiGuidanceError('');
    setShowAiGuidanceModal(false);

    try {
      const result = await executeCode(code, language, stdin);
      const blocks = [];
      if (result.output) blocks.push(result.output);
      if (result.error) blocks.push(`[Error]\n${result.error}`);
      if (!result.success && result.exitCode !== undefined) {
        blocks.push(`[Exit Code: ${result.exitCode}]`);
      }

      if (!result.success) {
        setLastFailedExecution({
          code,
          language,
          stdin,
          executionResult: {
            success: false,
            output: result.output || '',
            error: result.error || '',
            exitCode: result.exitCode
          }
        });
      }

      const outputText = blocks.join('\n');

      setOutput(outputText || '程序执行完成，无输出。');
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        return;
      }
      setOutput(`[Error] ${getErrorMessage(error, '代码执行请求失败，请稍后重试')}`);
      setLastFailedExecution(null);
    } finally {
      setIsRunning(false);
    }
  }, [code, language, logout, stdin, user]);

  const handleRequestAiGuidance = useCallback(async () => {
    if (!lastFailedExecution) return;

    setShowAiGuidanceModal(true);
    setAiGuidanceLoading(true);
    setAiGuidance('');
    setAiGuidanceError('');

    try {
      const data = await generateAiGuidance(lastFailedExecution);
      setAiGuidance(data.guidance || 'AI 未返回教学指导内容。');
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        return;
      }
      setAiGuidanceError(getErrorMessage(error, 'AI 教学指导生成失败'));
    } finally {
      setAiGuidanceLoading(false);
    }
  }, [lastFailedExecution, logout]);

  const handleSave = useCallback(async () => {
    if (!user?.permissions?.canSaveFiles) {
      setOutput('[Error] 当前账号没有保存文件权限');
      return;
    }

    const inputName = prompt('请输入文件名：', currentFile?.name || `main.${getExtension(language)}`);
    if (inputName === null) return;

    const fileName = inputName.trim();
    if (!fileName) {
      setOutput('[Error] 文件名不能为空');
      return;
    }

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
      setOutput(`文件已保存：${savedFile.name}`);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        return;
      }
      setOutput(`[Error] 保存失败：${getErrorMessage(error, '请稍后重试')}`);
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
      if (error.response?.status === 401) {
        logout();
        return;
      }
      setOutput(`[Error] 读取文件失败：${getErrorMessage(error, '请稍后重试')}`);
    }
  }, [logout]);

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
    return <div className="loading-page">正在检查登录状态...</div>;
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
          <h1 className="logo">online-IDE</h1>
          <span className="file-name">{currentFile ? currentFile.name : '未命名'}</span>
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

          {canManageUsers && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowAiSettings(true)}
            >
              AI 设置
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
              文件
            </button>
          )}

          {canSaveFiles && (
            <button className="btn btn-secondary" onClick={handleNewFile}>
              新建
            </button>
          )}

          {canSaveFiles && (
            <button className="btn btn-secondary" onClick={handleSave}>
              保存
            </button>
          )}

          {canSubmitCode && (
            <button className="btn btn-secondary" onClick={() => setShowSubmitModal(true)}>
              提交给老师
            </button>
          )}

          <button className="btn btn-primary" onClick={handleRun} disabled={isRunning || !user.permissions?.canRunCode}>
            {isRunning ? '运行中...' : '▶ 运行'}
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
            <div className="stdin-header">输入</div>
            <textarea
              className="stdin-input"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="在这里输入..."
            />
          </div>
          <OutputTerminal
            output={output}
            canRequestAiGuidance={Boolean(lastFailedExecution)}
            onRequestAiGuidance={handleRequestAiGuidance}
            aiGuidanceLoading={aiGuidanceLoading}
          />
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

      <AiSettingsModal
        open={showAiSettings}
        onClose={() => setShowAiSettings(false)}
      />

      <AiGuidanceModal
        open={showAiGuidanceModal}
        loading={aiGuidanceLoading}
        error={aiGuidanceError}
        guidance={aiGuidance}
        onClose={() => setShowAiGuidanceModal(false)}
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

function getErrorMessage(error, fallback) {
  return error?.response?.data?.error || fallback;
}

export default App;
