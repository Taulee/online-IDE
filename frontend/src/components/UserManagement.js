import React, { useCallback, useEffect, useState } from 'react';
import {
  createUser,
  getUsers,
  removeUser,
  updateUser
} from '../services/api';

const DEFAULT_STUDENT_PERMISSIONS = {
  canRunCode: true,
  canSaveFiles: true,
  canSubmitCode: true,
  canManageUsers: false,
  canReviewSubmissions: false
};

const DEFAULT_TEACHER_PERMISSIONS = {
  canRunCode: true,
  canSaveFiles: true,
  canSubmitCode: false,
  canManageUsers: true,
  canReviewSubmissions: true
};

const ROLE_LABELS = {
  teacher: '老师',
  student: '学生'
};

const PERMISSION_LABELS = {
  canRunCode: '允许运行代码',
  canSaveFiles: '允许保存文件',
  canSubmitCode: '允许提交代码',
  canManageUsers: '允许管理用户',
  canReviewSubmissions: '允许查看提交'
};

function getRoleDefaults(role) {
  return role === 'teacher' ? DEFAULT_TEACHER_PERMISSIONS : DEFAULT_STUDENT_PERMISSIONS;
}

function UserManagement({ currentUser, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    password: '',
    role: 'student'
  });

  const [editingUser, setEditingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data.users || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || '加载用户失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async (event) => {
    event.preventDefault();
    try {
      await createUser({
        ...newUser,
        permissions: getRoleDefaults(newUser.role)
      });
      setNewUser({
        username: '',
        name: '',
        password: '',
        role: 'student'
      });
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || '创建用户失败');
    }
  };

  const handleRoleChange = (role) => {
    setEditingUser((prev) => ({
      ...prev,
      role,
      permissions: getRoleDefaults(role)
    }));
  };

  const handlePermissionChange = (key, value) => {
    setEditingUser((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: value
      }
    }));
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    try {
      const payload = {
        name: editingUser.name,
        role: editingUser.role,
        isActive: editingUser.isActive,
        permissions: editingUser.permissions
      };
      if (newPassword.trim()) {
        payload.password = newPassword.trim();
      }
      await updateUser(editingUser._id, payload);
      setEditingUser(null);
      setNewPassword('');
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || '更新用户失败');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('确定删除该用户吗？')) return;
    try {
      await removeUser(userId);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || '删除用户失败');
    }
  };

  return (
    <div className="drawer-panel">
      <div className="drawer-header">
        <h3>用户管理</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="drawer-content">
        {error && <div className="error">{error}</div>}

        <form className="form-block" onSubmit={handleCreate}>
          <h4>添加用户</h4>
          <input
            type="text"
            placeholder="用户名"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="显示名（可选）"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          />
          <input
            type="password"
            placeholder="初始密码"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            required
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="student">学生</option>
            <option value="teacher">老师</option>
          </select>
          <button className="btn btn-primary" type="submit">添加</button>
        </form>

        <div className="form-block">
          <h4>用户列表</h4>
          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <ul className="user-list">
              {users.map((user) => (
                <li key={user._id} className="user-item">
                  <div>
                    <strong>{user.username}</strong>（{ROLE_LABELS[user.role] || user.role}）
                    {!user.isActive && <span className="tag danger">禁用</span>}
                    {currentUser._id === user._id && <span className="tag">当前</span>}
                  </div>
                  <div className="row-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setEditingUser(user)}
                    >
                      编辑
                    </button>
                    {currentUser._id !== user._id && (
                      <button
                        className="btn btn-secondary danger-btn"
                        onClick={() => handleDelete(user._id)}
                      >
                        删除
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {editingUser && (
          <div className="form-block">
            <h4>编辑用户：{editingUser.username}</h4>
            <input
              type="text"
              value={editingUser.name || ''}
              onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
              placeholder="显示名"
            />
            <select
              value={editingUser.role}
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              <option value="student">学生</option>
              <option value="teacher">老师</option>
            </select>
            <label className="check-line">
              <input
                type="checkbox"
                checked={editingUser.isActive}
                onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
              />
              启用账号
            </label>

            <div className="permission-grid">
              {Object.keys(editingUser.permissions || {}).map((key) => (
                <label key={key} className="check-line">
                  <input
                    type="checkbox"
                    checked={Boolean(editingUser.permissions[key])}
                    onChange={(e) => handlePermissionChange(key, e.target.checked)}
                  />
                  {PERMISSION_LABELS[key] || key}
                </label>
              ))}
            </div>

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="重置密码（可选）"
            />

            <div className="row-actions">
              <button className="btn btn-primary" onClick={handleUpdate}>保存</button>
              <button className="btn btn-secondary" onClick={() => setEditingUser(null)}>取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
