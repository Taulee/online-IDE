import React from "react";

function AiGuidanceModal({ open, loading, error, guidance, onClose }) {
    if (!open) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-card ai-guidance-modal">
                <div className="modal-header">
                    <div>
                        <h3>AI 教学指导</h3>
                        <span className="small-text">
                            基于最近一次运行失败的代码、输入和错误输出生成。
                        </span>
                    </div>
                    <button
                        className="close-btn"
                        type="button"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="guidance-content">
                    {loading && (
                        <div className="loading">正在生成 AI 教学指导...</div>
                    )}
                    {!loading && error && <div className="error">{error}</div>}
                    {!loading && !error && (
                        <pre>{guidance || "暂无 AI 教学指导。"}</pre>
                    )}
                </div>

                <div className="modal-actions">
                    <span className="small-text">
                        修改代码后重新运行，可基于新的报错重新生成。
                    </span>
                    <button
                        className="btn btn-primary"
                        type="button"
                        onClick={onClose}
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AiGuidanceModal;
