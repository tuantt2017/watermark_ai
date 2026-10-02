import React from 'react';
import { Image, Video, Sparkles, Key, Wand2, Scissors } from './Icons';
import { getStoredApiKey } from '../services/geminiService';

export default function Header({ activeTab, setActiveTab, onOpenApiKeyModal }) {
  const hasApiKey = !!getStoredApiKey();

  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-icon">
          <Wand2 size={24} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="brand-title">WatermarkRemover AI</span>
            <span className="brand-badge">Client-Side WASM</span>
          </div>
          <p className="brand-sub">Xóa Watermark Ảnh & Video ngay trong trình duyệt • Không cần Server</p>
        </div>
      </div>

      <div className="header-actions">
        <nav className="tabs-nav">
          <button
            className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            <Image size={17} />
            <span>Xử Lý Ảnh</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            <Video size={17} />
            <span>Xóa Watermark Video</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'trimmer' ? 'active' : ''}`}
            onClick={() => setActiveTab('trimmer')}
          >
            <Scissors size={17} />
            <span>Cắt Video</span>
          </button>
        </nav>

        <button
          className={`btn ${hasApiKey ? 'btn-secondary' : 'btn-gemini'}`}
          onClick={onOpenApiKeyModal}
          title="Cấu hình Google Gemini API Key"
        >
          <Key size={16} />
          <span>{hasApiKey ? 'Gemini: Đã kết nối' : 'Cấu hình Gemini AI'}</span>
          {hasApiKey && (
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--accent-emerald)',
                boxShadow: '0 0 8px var(--accent-emerald)'
              }}
            />
          )}
        </button>
      </div>
    </header>
  );
}
