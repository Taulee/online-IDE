import React, { useCallback, useEffect, useState } from "react";
import { getMySubmissions, getReceivedSubmissions } from "../services/api";

function SubmissionPanel({ mode, onClose, onLoadCode }) {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data =
                mode === "teacher"
                    ? await getReceivedSubmissions()
                    : await getMySubmissions();
            setSubmissions(data.submissions || []);
            setError("");
        } catch (err) {
            setError(err.response?.data?.error || "加载提交记录失败");
        } finally {
            setLoading(false);
        }
    }, [mode]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="drawer-panel">
            <div className="drawer-header">
                <h3>{mode === "teacher" ? "学生提交" : "我的提交"}</h3>
                <button className="close-btn" onClick={onClose}>
                    ×
                </button>
            </div>

            <div className="drawer-content">
                {loading && <div className="loading">加载中...</div>}
                {error && <div className="error">{error}</div>}
                {!loading && submissions.length === 0 && (
                    <div className="empty">暂无提交记录</div>
                )}
                <ul className="submission-list">
                    {submissions.map((item) => (
                        <li key={item._id} className="submission-item">
                            <div>
                                <strong>{item.submittedFileName}</strong>
                                <div className="small-text">
                                    {mode === "teacher"
                                        ? `学生：${item.student?.username || "-"}`
                                        : `老师：${item.teacher?.username || "-"}`}
                                </div>
                                <div className="small-text">
                                    {new Date(item.createdAt).toLocaleString(
                                        "zh-CN",
                                    )}
                                </div>
                            </div>
                            {mode === "teacher" && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => onLoadCode(item)}
                                >
                                    载入
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default SubmissionPanel;
