import React, { useState, useEffect } from 'react';
import { getFiles, deleteFile } from '../services/api';

function FileManager({ onSelect, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await getFiles();
      setFiles(data);
      setError(null);
    } catch (err) {
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, fileId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this file?')) return;
    
    try {
      await deleteFile(fileId);
      setFiles(files.filter(f => f._id !== fileId));
    } catch (err) {
      setError('Failed to delete file');
    }
  };

  const getLanguageIcon = (language) => {
    const icons = {
      python: '🐍',
      cpp: '⚡',
      nodejs: '🟢'
    };
    return icons[language] || '📄';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <h3>Saved Files</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="file-manager-content">
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && files.length === 0 && (
          <div className="empty">No saved files yet</div>
        )}
        
        <ul className="file-list">
          {files.map(file => (
            <li 
              key={file._id} 
              className="file-item"
              onClick={() => onSelect(file)}
            >
              <span className="file-icon">{getLanguageIcon(file.language)}</span>
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-date">{formatDate(file.updatedAt)}</span>
              </div>
              <button 
                className="delete-btn"
                onClick={(e) => handleDelete(e, file._id)}
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default FileManager;
