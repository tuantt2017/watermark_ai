import React, { useState } from 'react';
import Header from './components/Header';
import ImageRemover from './components/ImageRemover';
import VideoRemover from './components/VideoRemover';
import VideoTrimmer from './components/VideoTrimmer';
import ApiKeyModal from './components/ApiKeyModal';
import { ShieldCheck, Cpu, Sparkles } from './components/Icons';

export default function App() {
  const [activeTab, setActiveTab] = useState('image');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />

      {/* Main Tab Content */}
      <main>
        {activeTab === 'image' && (
          <ImageRemover onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)} />
        )}
        {activeTab === 'video' && (
          <VideoRemover />
        )}
        {activeTab === 'trimmer' && (
          <VideoTrimmer />
        )}
      </main>

      {/* Key Benefits / Feature Highlights */}
      <footer style={{ marginTop: '20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}
        >
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--accent-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Bảo Mật 100% Client-Side</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              Tất cả ảnh và video được xử lý trực tiếp trong RAM trình duyệt của bạn qua WebAssembly. Không có server trung gian, không lưu trữ dữ liệu.
            </p>
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Cpu size={18} />
              </div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Công Nghệ WebAssembly Cực Nhanh</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              Tích hợp OpenCV.js Telea cho ảnh và FFmpeg Delogo cho video. Tận dụng tối đa đa nhân CPU để render mượt mà.
            </p>
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(236, 72, 153, 0.15)',
                  color: 'var(--accent-pink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Sparkles size={18} />
              </div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Trợ Lực Bởi Google Gemini</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              Tự động quét toạ độ watermark bằng Vision AI và tái tạo nền tranh phức tạp bằng GenAI với API Key cá nhân miễn phí.
            </p>
          </div>
        </div>
      </footer>

      {/* Modal Cấu hình API Key */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
}
