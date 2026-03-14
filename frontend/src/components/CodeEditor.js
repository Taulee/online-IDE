import React from 'react';
import Editor from '@monaco-editor/react';

const LANGUAGE_MAP = {
  python: 'python',
  cpp: 'cpp',
  nodejs: 'javascript'
};

function CodeEditor({ code, language, onChange }) {
  const handleEditorChange = (value) => {
    onChange(value || '');
  };

  return (
    <div className="code-editor">
      <div className="editor-header">
        <span>Editor</span>
      </div>
      <Editor
        height="100%"
        language={LANGUAGE_MAP[language] || 'plaintext'}
        value={code}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 }
        }}
      />
    </div>
  );
}

export default CodeEditor;
