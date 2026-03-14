import React from 'react';

const LANGUAGES = [
  { id: 'python', name: 'Python', icon: '🐍' },
  { id: 'cpp', name: 'C++', icon: '⚡' },
  { id: 'nodejs', name: 'Node.js', icon: '🟢' }
];

function LanguageSelector({ language, onChange }) {
  return (
    <div className="language-selector">
      {LANGUAGES.map(lang => (
        <button
          key={lang.id}
          className={`lang-btn ${language === lang.id ? 'active' : ''}`}
          onClick={() => onChange(lang.id)}
        >
          <span className="lang-icon">{lang.icon}</span>
          <span className="lang-name">{lang.name}</span>
        </button>
      ))}
    </div>
  );
}

export default LanguageSelector;
