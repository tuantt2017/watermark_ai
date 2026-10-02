import React, { useState } from 'react';
import { Key, X, Check, ExternalLink, ShieldCheck, Sparkles, RefreshCw, AlertCircle } from './Icons';
import { getStoredApiKey, setStoredApiKey, listAvailableModels } from '../services/geminiService';

export default function ApiKeyModal({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [saved, setSaved] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredApiKey(apiKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    setApiKey('');
    setStoredApiKey('');
    setCheckResult(null);
  };

  const handleCheckModels = async () => {
    if (!apiKey) return;
    setIsChecking(true);
    setCheckResult(null);
    try {
      const models = await listAvailableModels(apiKey);
      const imageModels = models.filter((m) => 
        m.name.includes('image') || 
        m.name.includes('imagen') ||
        (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateImages'))
      );
      const proModels = models.filter((m) => m.name.includes('pro'));

      setCheckResult({
        success: true,
        total: models.length,
        imageModels: imageModels.map((m) => m.name.replace('models/', '')),
        proModels: proModels.map((m) => m.name.replace('models/', ''))
      });
    } catch (err) {
      setCheckResult({
        success: false,
        error: err.message
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon" style={{ width: '36px', height: '36px' }}>
              <Key size={18} />
            </div>
            <div>
              <h3 className="modal-title">Cấu hình Gemini API Key</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Hỗ trợ cả tài khoản Gemini Pro / Pay-as-you-go & Free Tier
              </p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Google AI Studio API Key:
          </label>
          <input
            type="password"
            className="input-field"
            placeholder="AIzaSy..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              Lấy API Key tại Google AI Studio <ExternalLink size={12} />
            </a>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleCheckModels}
                  disabled={isChecking}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
                >
                  {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra quyền Model'}
                </button>
              )}
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '0.78rem' }}
                >
                  Xóa Key
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Check Model Results */}
        {checkResult && (
          <div className={`status-banner ${checkResult.success ? 'status-success' : 'status-error'}`} style={{ flexDirection: 'column', alignItems: 'flex-start', fontSize: '0.8rem', gap: '6px' }}>
            {checkResult.success ? (
              <>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} /> API Key hợp lệ! Đã tìm thấy {checkResult.total} mô hình.
                </div>
                <div><strong>Mô hình Pro:</strong> {checkResult.proModels.length > 0 ? checkResult.proModels.join(', ') : 'Không có'}</div>
                <div><strong>Mô hình Xử lý Ảnh:</strong> {checkResult.imageModels.length > 0 ? checkResult.imageModels.join(', ') : 'Chưa kích hoạt'}</div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} /> Lỗi kiểm tra: {checkResult.error}
              </div>
            )}
          </div>
        )}

        {/* Notice about Gemini Pro subscription vs Google AI Studio Developer Billing */}
        <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: '0.78rem', color: 'var(--text-tertiary)', lineHeight: 1.5, border: '1px solid var(--border-subtle)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>💡 Lưu ý về tài khoản Gemini Pro:</strong>
          <br />
          Gói <em>Gemini Advanced / Pro ($20/tháng)</em> trên web <code>gemini.google.com</code> tách biệt với <em>Google AI Studio API</em>.
          Để gọi được model tạo/chỉnh sửa ảnh (<code>gemini-3.1-flash-image</code>), Google yêu cầu Project trên <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-secondary)' }}>AI Studio</a> cần liên kết phương thức thanh toán (Pay-as-you-go).
          Nếu Project ở chế độ mặc định, ứng dụng sẽ <strong>tự động chuyển sang chế độ AI Hybrid (dùng Gemini 3.8 Flash quét + OpenCV Telea)</strong> để xóa hoàn toàn miễn phí mà không báo lỗi!
        </div>

        <div className="status-banner status-info" style={{ fontSize: '0.8rem' }}>
          <ShieldCheck size={18} style={{ flexShrink: 0, color: 'var(--accent-emerald)' }} />
          <span>
            <strong>Bảo mật 100%:</strong> API Key chỉ được lưu cục bộ trong trình duyệt (LocalStorage) của bạn và được gửi trực tiếp tới máy chủ Google.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? <><Check size={16} /> Đã lưu!</> : <><Sparkles size={16} /> Lưu Cấu Hình</>}
          </button>
        </div>
      </div>
    </div>
  );
}
