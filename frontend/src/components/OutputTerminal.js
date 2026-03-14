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
        <span>Output</span>
        <div className="terminal-actions">
          <span className="terminal-dot red"></span>
          <span className="terminal-dot yellow"></span>
          <span className="terminal-dot green"></span>
        </div>
      </div>
      <div className="terminal-content" ref={terminalRef}>
        <pre>{output || 'Click "Run" to execute your code...'}</pre>
      </div>
    </div>
  );
}

export default OutputTerminal;
