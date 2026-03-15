import React, { useRef, useEffect } from 'react';

function OutputTerminal({ output }) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="output-terminal">
      <div className="terminal-header">
        <span>输出</span>
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
