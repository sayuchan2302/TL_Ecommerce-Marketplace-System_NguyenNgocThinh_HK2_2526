import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { reportService } from '../../services/reportService';
import type { ProductReportRequest } from '../../services/reportService';
import { ApiError } from '../../services/apiClient';
import './ReportProductModal.css';

interface ReportProductModalProps {
    productId: string;
    productName: string;
    onClose: () => void;
    onSuccess: () => void;
}

type ReportReason = ProductReportRequest['reason'];

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
    { value: 'FAKE_PRODUCT', label: 'Hàng giả, hàng nhái' },
    { value: 'WRONG_INFO', label: 'Thông tin sản phẩm sai lệch' },
    { value: 'INAPPROPRIATE', label: 'Nội dung không phù hợp/Phản cảm' },
    { value: 'PROHIBITED', label: 'Hàng cấm giao dịch' },
    { value: 'OTHER', label: 'Khác' },
];

const ReportProductModal: React.FC<ReportProductModalProps> = ({ productId, productName, onClose, onSuccess }) => {
    const [reason, setReason] = useState<ReportReason | ''>('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) {
            setError('Vui lòng chọn lý do tố cáo');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            const trimmedDescription = description.trim();
            await reportService.submitProductReport(productId, reason, trimmedDescription || undefined);
            onSuccess();
        } catch (err: unknown) {
            if (
                (err instanceof ApiError && err.status === 409) ||
                (err instanceof Error && err.message.includes('đã tố cáo'))
            ) {
                setError('Bạn đã tố cáo sản phẩm này rồi.');
            } else {
                setError('Có lỗi xảy ra khi gửi tố cáo. Vui lòng thử lại sau.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="report-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="report-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="report-modal-header">
                    <h3>Tố cáo sản phẩm</h3>
                    <button type="button" className="report-modal-close" onClick={onClose} aria-label="Đóng">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="report-modal-body">
                    <p className="report-modal-info">Bạn đang tố cáo sản phẩm <strong>{productName}</strong></p>

                    <div className="report-modal-group">
                        <label className="report-modal-label" htmlFor="reportReason">
                            Lý do tố cáo <span className="report-modal-required">*</span>
                        </label>
                        <select
                            id="reportReason"
                            className="report-modal-select"
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value as ReportReason);
                                setError(null);
                            }}
                            required
                        >
                            <option value="" disabled>
                                Chọn lý do tố cáo
                            </option>
                            {REPORT_REASONS.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="report-modal-group">
                        <label className="report-modal-label" htmlFor="reportDesc">Mô tả thêm (Không bắt buộc)</label>
                        <textarea
                            id="reportDesc"
                            className="report-modal-textarea"
                            placeholder="Cung cấp thêm chi tiết để giúp chúng tôi xử lý nhanh hơn..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            maxLength={500}
                        />
                        <div className="report-modal-char-count">{description.length}/500</div>
                    </div>

                    {error && (
                        <div className="report-modal-error">
                            <AlertTriangle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="report-modal-footer">
                        <button type="button" className="report-modal-btn-cancel" onClick={onClose} disabled={isSubmitting}>
                            Hủy
                        </button>
                        <button type="submit" className="report-modal-btn-submit" disabled={isSubmitting || !reason}>
                            {isSubmitting ? 'Đang gửi...' : 'Gửi Tố Cáo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportProductModal;
