import React, { useEffect, useState } from 'react';
import { getTeachers, submitCode } from '../services/api';

function SubmitCodeModal({ open, code, language, defaultFileName, onClose, onSuccess }) {
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [fileName, setFileName] = useState(defaultFileName);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFileName(defaultFileName);
  }, [defaultFileName]);

  useEffect(() => {
    if (!open) return;
    setError('');
    const loadTeachers = async () => {
      try {
        const data = await getTeachers();
        const teacherList = data.teachers || [];
        setTeachers(teacherList);
        if (teacherList.length > 0) {
          setTeacherId(teacherList[0]._id);
        }
      } catch (err) {
        setError(err.response?.data?.error || '加载老师列表失败');
      }
    };
    loadTeachers();
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await submitCode({
        teacherId,
        fileName,
        language,
        content: code
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <form className="modal-card" onSubmit={handleSubmit}>
        <h3>提交给老师</h3>
        <label htmlFor="teacher">老师</label>
        <select
          id="teacher"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          required
        >
          {teachers.map((teacher) => (
            <option key={teacher._id} value={teacher._id}>
              {teacher.name} ({teacher.username})
            </option>
          ))}
        </select>
        {teachers.length === 0 && (
          <div className="small-text">当前没有可选老师账号，请联系管理员添加老师用户。</div>
        )}

        <label htmlFor="filename">文件名</label>
        <input
          id="filename"
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          required
        />

        <div className="small-text">
          提交后文件名会自动变为：`学生用户名_文件名`
        </div>

        {error && <div className="error">{error}</div>}

        <div className="row-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting || teachers.length === 0}>
            {submitting ? '提交中...' : '提交'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

export default SubmitCodeModal;
