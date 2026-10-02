import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Video, Scissors, RefreshCw, Download, 
  Play, Pause, Clock, Check, AlertCircle, Sparkles
} from './Icons';
import { trimVideo } from '../services/videoService';

export default function VideoTrimmer() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('info'); // info, success, error

  const [trimmedVideoUrl, setTrimmedVideoUrl] = useState(null);
  const [trimmedDuration, setTrimmedDuration] = useState(0);
  const [trimmedSize, setTrimmedSize] = useState(0);

  const videoRef = useRef(null);

  // Time formatter MM:SS.s
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '00:00.0';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
      if (trimmedVideoUrl) URL.revokeObjectURL(trimmedVideoUrl);
    };
  }, [videoSrc, trimmedVideoUrl]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('video/')) {
      setStatusMsg('Vui lòng chọn một tệp video hợp lệ (MP4, WebM, MOV, MKV).');
      setStatusType('error');
      return;
    }

    if (videoSrc) URL.revokeObjectURL(videoSrc);
    if (trimmedVideoUrl) URL.revokeObjectURL(trimmedVideoUrl);

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setTrimmedVideoUrl(null);
    setTrimmedDuration(0);
    setTrimmedSize(0);
    setProgress(0);
    setStatusMsg('');
    setIsPlaying(false);
  };

  // Generate a Demo Sample Video in-browser with HTML5 Canvas & MediaRecorder
  const generateDemoVideo = async () => {
    setStatusMsg('Đang tạo video mẫu demo trực tiếp trong trình duyệt...');
    setStatusType('info');

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(30);
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    } catch (e) {
      recorder = new MediaRecorder(stream);
    }

    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();

    // 5-second dynamic animated countdown scene
    let frame = 0;
    const totalFrames = 150; // 5 seconds at 30 fps

    const renderFrame = () => {
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      const shift = (frame / totalFrames) * 360;
      grad.addColorStop(0, `hsl(${shift}, 70%, 15%)`);
      grad.addColorStop(1, `hsl(${(shift + 80) % 360}, 75%, 25%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // Moving circles
      for (let i = 0; i < 5; i++) {
        const x = (frame * (i + 1) * 3) % 640;
        const y = 80 + i * 50 + Math.sin(frame * 0.05 + i) * 30;
        ctx.fillStyle = `hsla(${(shift + i * 40) % 360}, 80%, 60%, 0.4)`;
        ctx.beginPath();
        ctx.arc(x, y, 24 + i * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Timecode display in video
      const currentSec = (frame / 30).toFixed(1);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Video Cắt Mẫu Demo: ${currentSec}s / 5.0s`, 320, 180);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '18px sans-serif';
      ctx.fillText('Thử nghiệm kéo thanh trượt để cắt video', 320, 220);

      frame++;
      if (frame < totalFrames) {
        requestAnimationFrame(renderFrame);
      } else {
        recorder.stop();
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const demoFile = new File([blob], 'demo_cut_video.webm', { type: 'video/webm' });
      handleFile(demoFile);
      setStatusMsg('Video mẫu đã sẵn sàng! Hãy chọn đoạn cần cắt và bấm Cắt Video.');
      setStatusType('success');
    };

    renderFrame();
  };

  const handleLoadedMetadata = (e) => {
    const dur = e.target.duration || 0;
    if (dur > 0) {
      const roundedDur = Number(dur.toFixed(1));
      setVideoDuration(roundedDur);
      setTrimStart(0);
      setTrimEnd(roundedDur);
    }
  };

  const handleTimeUpdate = (e) => {
    setCurrentTime(e.target.currentTime || 0);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const updateTrimStart = (val) => {
    const maxAllowed = Math.max(0, (trimEnd || videoDuration) - 0.2);
    const num = Math.max(0, Math.min(Number(val), maxAllowed));
    const rounded = Number(num.toFixed(1));
    setTrimStart(rounded);
    if (videoRef.current) {
      videoRef.current.currentTime = rounded;
    }
  };

  const updateTrimEnd = (val) => {
    const minAllowed = trimStart + 0.2;
    const num = Math.min(videoDuration || 9999, Math.max(Number(val), minAllowed));
    const rounded = Number(num.toFixed(1));
    setTrimEnd(rounded);
    if (videoRef.current) {
      videoRef.current.currentTime = rounded;
    }
  };

  const setTrimStartToCurrent = () => {
    if (videoRef.current) {
      updateTrimStart(videoRef.current.currentTime);
    }
  };

  const setTrimEndToCurrent = () => {
    if (videoRef.current) {
      updateTrimEnd(videoRef.current.currentTime);
    }
  };

  const previewTrimSegment = () => {
    if (!videoRef.current) return;
    const vid = videoRef.current;
    vid.currentTime = trimStart;
    vid.play();
    setIsPlaying(true);

    const onTimeCheck = () => {
      if (vid.currentTime >= trimEnd) {
        vid.pause();
        setIsPlaying(false);
        vid.removeEventListener('timeupdate', onTimeCheck);
      }
    };
    vid.addEventListener('timeupdate', onTimeCheck);
  };

  const handleTrimVideo = async () => {
    if (!videoFile && !videoSrc) return;

    const start = Math.max(0, trimStart);
    const end = Math.min(videoDuration || 9999, trimEnd);

    if (end - start < 0.2) {
      setStatusMsg('Thời lượng đoạn cắt tối thiểu là 0.2 giây.');
      setStatusType('error');
      return;
    }

    setIsTrimming(true);
    setProgress(0);
    setStatusType('info');
    setStatusMsg(`Đang cắt video từ ${formatTime(start)} đến ${formatTime(end)}...`);

    try {
      const source = videoFile || videoSrc;
      const res = await trimVideo(
        source,
        start,
        end,
        (pct) => setProgress(pct),
        (msg) => setStatusMsg(msg)
      );

      if (trimmedVideoUrl) URL.revokeObjectURL(trimmedVideoUrl);
      setTrimmedVideoUrl(res.url);
      setTrimmedDuration(res.duration);
      setTrimmedSize(res.size);
      setStatusMsg(`Cắt video thành công (${res.duration.toFixed(1)}s)! Bạn có thể xem thử và tải về bên dưới.`);
      setStatusType('success');
    } catch (err) {
      console.error(err);
      setStatusMsg(`Lỗi khi cắt video: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsTrimming(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Upload Zone or Video Editor */}
      {!videoSrc ? (
        <div className="card">
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
            onClick={() => document.getElementById('trimmer-upload-input').click()}
          >
            <input
              id="trimmer-upload-input"
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="dropzone-icon">
              <Scissors size={32} />
            </div>
            <div>
              <h3 className="dropzone-title">Kéo & Thả hoặc Nhấn để tải Video cần Cắt</h3>
              <p className="dropzone-desc">
                Cắt lấy đoạn video mong muốn trực tiếp trong trình duyệt bằng FFmpeg WebAssembly. Nhanh chóng, chính xác từng khung hình, bảo mật 100% không gửi video lên máy chủ.
              </p>
            </div>
            <div className="dropzone-formats">
              <span className="format-tag">MP4</span>
              <span className="format-tag">WEBM</span>
              <span className="format-tag">MOV</span>
              <span className="format-tag">MKV</span>
              <span className="format-tag">FFmpeg WASM</span>
            </div>
            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  generateDemoVideo();
                }}
              >
                <Sparkles size={16} /> Tạo Video Mẫu Để Thử Cắt Ngay
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="editor-layout">
          {/* Main Video Viewport Panel */}
          <div className="viewport-panel">
            {/* Toolbar */}
            <div className="viewport-toolbar">
              <div className="toolbar-group">
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={togglePlay}
                >
                  {isPlaying ? <><Pause size={15} /> Tạm dừng</> : <><Play size={15} /> Phát video</>}
                </button>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  ⏱️ {formatTime(currentTime)} / {formatTime(videoDuration)}
                </span>
              </div>

              <div className="toolbar-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => {
                    setVideoSrc(null);
                    setTrimmedVideoUrl(null);
                    setStatusMsg('');
                  }}
                >
                  Đổi video khác
                </button>
              </div>
            </div>

            {/* Video Canvas Stage */}
            <div className="viewport-canvas-area" style={{ background: '#05070a' }}>
              <video
                ref={videoRef}
                src={videoSrc}
                controls
                playsInline
                preload="auto"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                style={{
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'block'
                }}
              />
            </div>

            {/* Footer Control Hint */}
            <div
              style={{
                padding: '10px 16px',
                background: 'rgba(14, 19, 31, 0.9)',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                Tạm dừng video tại mốc bất kỳ để bấm "Đặt mốc hiện tại" chuẩn xác từng giây.
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 2);
                    }
                  }}
                >
                  ⏪ -2s
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.min(videoDuration, videoRef.current.currentTime + 2);
                    }
                  }}
                >
                  ⏩ +2s
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="controls-sidebar">
            {/* Status & Progress Banner */}
            {statusMsg && (
              <div
                className={`status-banner ${
                  statusType === 'success'
                    ? 'status-success'
                    : statusType === 'error'
                    ? 'status-error'
                    : 'status-info'
                }`}
              >
                {statusType === 'success' ? (
                  <Check size={18} />
                ) : statusType === 'error' ? (
                  <AlertCircle size={18} />
                ) : (
                  <RefreshCw size={18} className={isTrimming ? 'animate-spin' : ''} />
                )}
                <span>{statusMsg}</span>
              </div>
            )}

            {/* Progress Bar (during trimming) */}
            {isTrimming && (
              <div className="card control-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tiến trình cắt video:</span>
                  <span className="range-val">{progress}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Trimmer Settings Card */}
            <div className="card control-section">
              <span className="section-label">Thông Số Cắt Video</span>

              {/* Visual Timeline Bar */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Đoạn cắt đã chọn:</span>
                  <span style={{ color: 'var(--accent-secondary)', fontWeight: 700 }}>
                    {formatTime(trimStart)} ➜ {formatTime(trimEnd)}
                  </span>
                </div>

                <div style={{ position: 'relative', height: '16px', background: 'var(--bg-deep)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-medium)' }}>
                  {/* Selected region fill */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${videoDuration ? (trimStart / videoDuration) * 100 : 0}%`,
                      width: `${videoDuration ? Math.max(2, ((trimEnd - trimStart) / videoDuration) * 100) : 100}%`,
                      background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                      borderRadius: '4px'
                    }}
                  />
                  {/* Real-time playhead scrubber */}
                  {videoDuration > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${(currentTime / videoDuration) * 100}%`,
                        width: '2px',
                        background: '#ffffff',
                        boxShadow: '0 0 8px rgba(255,255,255,0.9)'
                      }}
                    />
                  )}
                </div>
                <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                  Độ dài đoạn cắt: {Math.max(0, trimEnd - trimStart).toFixed(1)} giây
                </div>
              </div>

              {/* Start Point Controller */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <label style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="#6366f1" /> Bắt đầu (Start):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => updateTrimStart(trimStart - 1)}
                      title="Lùi 1s"
                    >
                      -1s
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => updateTrimStart(trimStart - 0.1)}
                      title="Lùi 0.1s"
                    >
                      -0.1s
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => updateTrimStart(trimStart + 0.1)}
                      title="Tiến 0.1s"
                    >
                      +0.1s
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => updateTrimStart(trimStart + 1)}
                      title="Tiến 1s"
                    >
                      +1s
                    </button>
                    <span className="range-val" style={{ minWidth: '44px', textAlign: 'right' }}>
                      {trimStart.toFixed(1)}s
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="0"
                    max={videoDuration || 10}
                    step="0.1"
                    value={trimStart}
                    onChange={(e) => updateTrimStart(Number(e.target.value))}
                    className="range-slider"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                    onClick={setTrimStartToCurrent}
                    title="Đặt mốc bắt đầu tại thời điểm video đang dừng"
                  >
                    ⏱️ Mốc hiện tại
                  </button>
                </div>
              </div>

              {/* End Point Controller */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <label style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="#06b6d4" /> Kết thúc (End):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => updateTrimEnd(trimEnd - 1)}
                      title="Lùi 1s"
                    >
                      -1s
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => updateTrimEnd(trimEnd - 0.1)}
                      title="Lùi 0.1s"
                    >
                      -0.1s
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => updateTrimEnd(trimEnd + 0.1)}
                      title="Tiến 0.1s"
                    >
                      +0.1s
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => updateTrimEnd(trimEnd + 1)}
                      title="Tiến 1s"
                    >
                      +1s
                    </button>
                    <span className="range-val" style={{ minWidth: '44px', textAlign: 'right' }}>
                      {trimEnd.toFixed(1)}s
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="0"
                    max={videoDuration || 10}
                    step="0.1"
                    value={trimEnd}
                    onChange={(e) => updateTrimEnd(Number(e.target.value))}
                    className="range-slider"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', color: '#22d3ee', borderColor: 'rgba(6, 182, 212, 0.4)' }}
                    onClick={setTrimEndToCurrent}
                    title="Đặt mốc kết thúc tại thời điểm video đang dừng"
                  >
                    ⏱️ Mốc hiện tại
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Preview & Trim Action Buttons */}
            <div className="card control-section">
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', marginBottom: '10px', padding: '11px', fontSize: '0.85rem' }}
                onClick={previewTrimSegment}
                disabled={isTrimming}
              >
                <Play size={16} /> Xem Thử Đoạn Cắt
              </button>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '0.9rem' }}
                onClick={handleTrimVideo}
                disabled={isTrimming || trimEnd <= trimStart}
              >
                {isTrimming ? (
                  <><RefreshCw size={18} className="animate-spin" /> Đang Cắt Video...</>
                ) : (
                  <><Scissors size={18} /> Cắt Video Ngay</>
                )}
              </button>
            </div>

            {/* Trimmed Video Output Preview & Download */}
            {trimmedVideoUrl && (
              <div
                className="card control-section"
                style={{
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  background: 'rgba(16, 185, 129, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={18} /> Cắt Video Thành Công!
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {trimmedDuration.toFixed(1)}s • {(trimmedSize / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>

                <video
                  src={trimmedVideoUrl}
                  controls
                  playsInline
                  style={{
                    width: '100%',
                    maxHeight: '180px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#000000',
                    display: 'block',
                    marginBottom: '10px'
                  }}
                />

                <a
                  href={trimmedVideoUrl}
                  download={`video_trimmed_${Date.now()}.mp4`}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderColor: '#10b981',
                    fontSize: '0.88rem'
                  }}
                >
                  <Download size={18} /> Tải Video Đã Cắt Về Máy (MP4)
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
