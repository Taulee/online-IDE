import React, { useState, useEffect, useCallback } from 'react';
import { getFiles, deleteFile } from '../services/api';

function FileManager({ onSelect, onClose, canDelete = true, refreshKey = 0 }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFiles();
      setFiles(data.files || []);
      setError(null);
    } catch (err) {
      setError('加载文件列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles, refreshKey]);

  const handleDelete = async (e, fileId) => {
    e.stopPropagation();
    if (!window.confirm('确定删除这个文件吗？')) return;
    
    try {
      await deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
    } catch (err) {
      setError('删除文件失败');
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
    return new Date(dateString).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <h3>已保存文件</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="file-manager-content">
        {loading && <div className="loading">加载中...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && files.length === 0 && (
          <div className="empty">还没有保存的文件</div>
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
              {canDelete && (
                <button 
                  className="delete-btn"
                  onClick={(e) => handleDelete(e, file._id)}
                >
                  🗑️
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default FileManager;
