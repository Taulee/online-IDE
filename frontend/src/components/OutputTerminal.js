import React, { useRef, useEffect } from 'react';

function OutputTerminal({ output, canRequestAiGuidance, onRequestAiGuidance, aiGuidanceLoading }) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="output-terminal">
      <div className="terminal-header">
        <div className="terminal-title">
          <span>输出</span>
          {canRequestAiGuidance && (
            <button
              className="btn btn-secondary terminal-ai-btn"
              type="button"
              onClick={onRequestAiGuidance}
              disabled={aiGuidanceLoading}
            >
              {aiGuidanceLoading ? '生成中...' : 'AI 指导'}
            </button>
          )}
        </div>
        <div className="terminal-actions">
          <span className="terminal-dot red"></span>
          <span className="terminal-dot yellow"></span>
          <span className="terminal-dot green"></span>
        </div>
      </div>
      <div className="terminal-content" ref={terminalRef}>
        <pre>{output || '点击“运行”来执行代码...'}</pre>
      </div>
    </div>
  );
}

export default OutputTerminal;
