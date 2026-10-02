import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Video, Wand2, RefreshCw, Download, 
  Play, Pause, RotateCcw, AlertCircle, Check, 
  Sparkles, Layers, Sliders, Scissors, Clock
} from './Icons';
import { removeVideoWatermark, trimVideo } from '../services/videoService';

export default function VideoRemover() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [resultVideoUrl, setResultVideoUrl] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [trimmedVideoUrl, setTrimmedVideoUrl] = useState(null);
  const [trimmedBlob, setTrimmedBlob] = useState(null);
  const [trimmedDuration, setTrimmedDuration] = useState(0);
  const [trimmedSize, setTrimmedSize] = useState(0);
  const [isTrimming, setIsTrimming] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('info'); // info, success, error
  const [processMode, setProcessMode] = useState('blur'); // 'blur' (Feathered) or 'delogo'
  const [featherRadius, setFeatherRadius] = useState(14); // 4 to 28 px
  const [blurRadius, setBlurRadius] = useState(18); // 8 to 32

  // Bounding box in display coordinates (relative to video element)
  const [box, setBox] = useState({ x: 20, y: 20, width: 140, height: 60 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactionType, setInteractionType] = useState(null); // 'create', 'move', 'resize'
  const startDragPos = useRef({ x: 0, y: 0 });
  const initialBoxState = useRef({ ...box });

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const resultVideoRef = useRef(null);

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
      if (resultVideoUrl) URL.revokeObjectURL(resultVideoUrl);
      if (trimmedVideoUrl) URL.revokeObjectURL(trimmedVideoUrl);
    };
  }, [videoSrc, resultVideoUrl, trimmedVideoUrl]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('video/')) {
      setStatusMsg('Vui lòng chọn một tệp video hợp lệ (MP4, WebM, MOV).');
      setStatusType('error');
      return;
    }

    if (videoSrc) URL.revokeObjectURL(videoSrc);
    if (resultVideoUrl) URL.revokeObjectURL(resultVideoUrl);
    if (trimmedVideoUrl) URL.revokeObjectURL(trimmedVideoUrl);

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setResultVideoUrl(null);
    setResultBlob(null);
    setTrimmedVideoUrl(null);
    setTrimmedBlob(null);
    setTrimmedDuration(0);
    setProgress(0);
    setStatusMsg('');
    setIsPlaying(false);

    // Default watermark position (Top-right corner)
    setTimeout(() => {
      if (videoRef.current) {
        const vw = videoRef.current.clientWidth || 400;
        setBox({
          x: Math.max(10, vw - 160),
          y: 20,
          width: 140,
          height: 60
        });
      }
    }, 400);
  };

  // Generate a Demo Sample Video in-browser with HTML5 Canvas & MediaRecorder
  const generateDemoVideo = async () => {
    setStatusMsg('Đang tạo video mẫu demo trực tiếp trong trình duyệt...');
    setStatusType('info');

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(30); // 30 FPS
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    } catch (e) {
      recorder = new MediaRecorder(stream);
    }

    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();

    // Animate a 3-second scene with a logo watermark
    let frame = 0;
    const totalFrames = 90; // 3 seconds at 30 fps

    const renderFrame = () => {
      // Dynamic animated background
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#312e81');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // Moving colorful ball
      const ballX = 100 + Math.sin(frame * 0.05) * 200 + 100;
      const ballY = 180 + Math.cos(frame * 0.08) * 80;
      ctx.beginPath();
      ctx.arc(ballX, ballY, 32, 0, Math.PI * 2);
      ctx.fillStyle = '#ec4899';
      ctx.fill();

      // Scenery grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 640; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 360);
        ctx.stroke();
      }

      // STATIC CORNER WATERMARK TO REMOVE
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(470, 20, 150, 48);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.strokeRect(470, 20, 150, 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('DEMO WATERMARK', 480, 50);

      frame++;
      if (frame < totalFrames) {
        requestAnimationFrame(renderFrame);
      } else {
        recorder.stop();
      }
    };

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'video/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mimeType });
      const file = new File([blob], `demo_video.${ext}`, { type: mimeType });
      handleFile(file);
      setStatusMsg('Đã nạp video mẫu! Vùng watermark mẫu nằm ở góc trên bên phải.');
      setStatusType('success');
    };

    renderFrame();
  };

  // Video play/pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Preset box positions
  const applyPreset = (preset) => {
    if (!videoRef.current) return;
    const vw = videoRef.current.clientWidth;
    const vh = videoRef.current.clientHeight;

    const w = 150;
    const h = 55;
    const pad = 15;

    switch (preset) {
      case 'top-right':
        setBox({ x: vw - w - pad, y: pad, width: w, height: h });
        break;
      case 'bottom-right':
        setBox({ x: vw - w - pad, y: vh - h - pad, width: w, height: h });
        break;
      case 'top-left':
        setBox({ x: pad, y: pad, width: w, height: h });
        break;
      case 'bottom-left':
        setBox({ x: pad, y: vh - h - pad, width: w, height: h });
        break;
      default:
        break;
    }
  };

  // Mouse drag handlers on the video container
  const handleContainerMouseDown = (e) => {
    if (isLoading || !videoRef.current) return;
    const rect = videoContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked inside box
    const inBox = x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
    // Check if clicked resize handle (bottom-right 16x16 corner)
    const inHandle =
      x >= box.x + box.width - 16 &&
      x <= box.x + box.width + 8 &&
      y >= box.y + box.height - 16 &&
      y <= box.y + box.height + 8;

    setIsInteracting(true);
    startDragPos.current = { x, y };
    initialBoxState.current = { ...box };

    if (inHandle) {
      setInteractionType('resize');
    } else if (inBox) {
      setInteractionType('move');
    } else {
      // Start creating new box
      setInteractionType('create');
      setBox({ x, y, width: 20, height: 20 });
    }
  };

  const handleContainerMouseMove = (e) => {
    if (!isInteracting || !videoContainerRef.current) return;
    const rect = videoContainerRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    const dx = curX - startDragPos.current.x;
    const dy = curY - startDragPos.current.y;

    const maxW = videoContainerRef.current.clientWidth;
    const maxH = videoContainerRef.current.clientHeight;

    if (interactionType === 'move') {
      const newX = Math.max(0, Math.min(initialBoxState.current.x + dx, maxW - initialBoxState.current.width));
      const newY = Math.max(0, Math.min(initialBoxState.current.y + dy, maxH - initialBoxState.current.height));
      setBox((prev) => ({ ...prev, x: Math.round(newX), y: Math.round(newY) }));
    } else if (interactionType === 'resize') {
      const newW = Math.max(20, Math.min(initialBoxState.current.width + dx, maxW - initialBoxState.current.x));
      const newH = Math.max(20, Math.min(initialBoxState.current.height + dy, maxH - initialBoxState.current.y));
      setBox((prev) => ({ ...prev, width: Math.round(newW), height: Math.round(newH) }));
    } else if (interactionType === 'create') {
      const x = Math.min(startDragPos.current.x, curX);
      const y = Math.min(startDragPos.current.y, curY);
      const w = Math.max(20, Math.abs(curX - startDragPos.current.x));
      const h = Math.max(20, Math.abs(curY - startDragPos.current.y));
      setBox({ x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) });
    }
  };

  const handleContainerMouseUp = () => {
    setIsInteracting(false);
    setInteractionType(null);
  };

  // Run FFmpeg Watermark Removal
  const handleProcessVideo = async () => {
    if (!videoFile || !videoRef.current) return;

    setIsLoading(true);
    setProgress(0);
    setStatusMsg('Đang khởi động bộ xử lý video FFmpeg WebAssembly...');
    setStatusType('info');

    const videoEl = videoRef.current;
    videoEl.pause();
    setIsPlaying(false);

    const displayW = videoEl.clientWidth || videoEl.offsetWidth || 640;
    const displayH = videoEl.clientHeight || videoEl.offsetHeight || 360;
    const vidW = videoEl.videoWidth || displayW;
    const vidH = videoEl.videoHeight || displayH;

    const coords = {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      videoWidth: vidW,
      videoHeight: vidH,
      displayWidth: displayW,
      displayHeight: displayH
    };

    try {
      const { blob, url, size } = await removeVideoWatermark(
        videoFile,
        coords,
        (pct) => setProgress(pct),
        (msg) => setStatusMsg(msg),
        { mode: processMode, featherRadius, blurRadius }
      );

      setResultBlob(blob);
      setResultVideoUrl(url);
      setTrimmedVideoUrl(null);
      setTrimmedBlob(null);
      setTrimmedDuration(0);
      const sizeMb = size ? (size / 1024 / 1024).toFixed(2) : '0';
      setStatusMsg(`Xóa watermark video thành công (Dung lượng: ${sizeMb} MB)! Bạn có thể xem thử, cắt đoạn video hoặc tải về bên dưới.`);
      setStatusType('success');
    } catch (err) {
      console.error(err);
      setStatusMsg(`Lỗi xử lý video: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Video trimming handlers
  const handleResultLoadedMetadata = (e) => {
    const dur = e.target.duration || 0;
    if (dur > 0) {
      setVideoDuration(dur);
      setTrimStart(0);
      setTrimEnd(Number(dur.toFixed(1)));
    }
  };

  const handleResultTimeUpdate = (e) => {
    setCurrentTime(e.target.currentTime || 0);
  };

  const updateTrimStart = (val) => {
    const maxAllowed = Math.max(0, (trimEnd || videoDuration) - 0.2);
    const num = Math.max(0, Math.min(Number(val), maxAllowed));
    const rounded = Number(num.toFixed(1));
    setTrimStart(rounded);
    if (resultVideoRef.current) {
      resultVideoRef.current.currentTime = rounded;
    }
  };

  const updateTrimEnd = (val) => {
    const minAllowed = trimStart + 0.2;
    const num = Math.min(videoDuration || 9999, Math.max(Number(val), minAllowed));
    const rounded = Number(num.toFixed(1));
    setTrimEnd(rounded);
    if (resultVideoRef.current) {
      resultVideoRef.current.currentTime = rounded;
    }
  };

  const setTrimStartToCurrent = () => {
    if (resultVideoRef.current) {
      updateTrimStart(resultVideoRef.current.currentTime);
    }
  };

  const setTrimEndToCurrent = () => {
    if (resultVideoRef.current) {
      updateTrimEnd(resultVideoRef.current.currentTime);
    }
  };

  const previewTrimSegment = () => {
    if (!resultVideoRef.current) return;
    const vid = resultVideoRef.current;
    vid.currentTime = trimStart;
    vid.play();

    const onTimeCheck = () => {
      if (vid.currentTime >= trimEnd) {
        vid.pause();
        vid.removeEventListener('timeupdate', onTimeCheck);
      }
    };
    vid.addEventListener('timeupdate', onTimeCheck);
  };

  const handleTrimVideo = async () => {
    if (!resultBlob && !resultVideoUrl) return;

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
      const source = resultBlob || resultVideoUrl;
      const res = await trimVideo(
        source,
        start,
        end,
        (pct) => setProgress(pct),
        (msg) => setStatusMsg(msg)
      );

      if (trimmedVideoUrl) URL.revokeObjectURL(trimmedVideoUrl);
      setTrimmedVideoUrl(res.url);
      setTrimmedBlob(res.blob);
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
            onClick={() => document.getElementById('video-upload-input').click()}
          >
            <input
              id="video-upload-input"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="dropzone-icon">
              <Video size={32} />
            </div>
            <div>
              <h3 className="dropzone-title">Kéo & Thả hoặc Nhấn để tải Video lên</h3>
              <p className="dropzone-desc">
                Hỗ trợ MP4, WebM, MOV. Video được xử lý 100% bằng WebAssembly trên CPU máy bạn, không upload lên mạng, bảo mật và tốc độ cao.
              </p>
            </div>
            <div className="dropzone-formats">
              <span className="format-tag">MP4</span>
              <span className="format-tag">WEBM</span>
              <span className="format-tag">MOV</span>
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
                <Sparkles size={16} /> Tạo Video Mẫu Để Thử Ngay
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="editor-layout">
          {/* Main Video Viewport */}
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
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                  Kéo khung viền đỏ để chọn vị trí watermark
                </span>
              </div>

              <div className="toolbar-group">
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => {
                    setVideoSrc(null);
                    setResultVideoUrl(null);
                    setStatusMsg('');
                  }}
                >
                  Đổi video khác
                </button>
              </div>
            </div>

            {/* Video Stage Area */}
            <div className="viewport-canvas-area">
              <div
                ref={videoContainerRef}
                className="video-stage-container"
                onMouseDown={handleContainerMouseDown}
                onMouseMove={handleContainerMouseMove}
                onMouseUp={handleContainerMouseUp}
              >
                <video
                  ref={videoRef}
                  src={videoSrc}
                  controls={false}
                  loop
                  playsInline
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '68vh',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-lg)'
                  }}
                  onLoadedMetadata={(e) => {
                    const el = e.target;
                    const vw = el.clientWidth || 400;
                    const vh = el.clientHeight || 250;
                    setBox({
                      x: Math.max(10, vw - 160),
                      y: 20,
                      width: Math.min(140, Math.max(40, vw - 20)),
                      height: Math.min(60, Math.max(30, vh - 30))
                    });
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                {/* Bounding Box for Delogo */}
                <div
                  className="delogo-box"
                  style={{
                    left: `${box.x}px`,
                    top: `${box.y}px`,
                    width: `${box.width}px`,
                    height: `${box.height}px`
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '-22px',
                      left: 0,
                      background: 'rgba(244, 63, 94, 0.9)',
                      color: 'white',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Vùng Xóa: {box.width}x{box.height} • Viền mờ: {featherRadius}px
                  </div>
                  <div className="delogo-handle" />
                </div>
              </div>
            </div>

            {/* Bottom Video Progress/Playback Bar */}
            <div
              style={{
                padding: '10px 16px',
                background: 'rgba(14, 19, 31, 0.9)',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <button
                className="btn btn-ghost"
                style={{ padding: '6px' }}
                onClick={togglePlay}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                Dừng video tại frame có watermark rõ nhất để căn chỉnh vùng chọn chuẩn xác.
              </span>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="controls-sidebar">
            {/* Status & Progress */}
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
                  <RefreshCw size={18} className={(isLoading || isTrimming) ? 'animate-spin' : ''} />
                )}
                <span>{statusMsg}</span>
              </div>
            )}

            {/* Progress Bar (during rendering & trimming) */}
            {(isLoading || isTrimming) && (
              <div className="card control-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tiến trình xử lý:</span>
                  <span className="range-val">{progress}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Position Presets */}
            <div className="card control-section">
              <span className="section-label">Vị Trí Mẫu Nhanh</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '8px', fontSize: '0.78rem' }}
                  onClick={() => applyPreset('top-right')}
                >
                  Góc Trên Phải
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '8px', fontSize: '0.78rem' }}
                  onClick={() => applyPreset('bottom-right')}
                >
                  Góc Dưới Phải
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '8px', fontSize: '0.78rem' }}
                  onClick={() => applyPreset('top-left')}
                >
                  Góc Trên Trái
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '8px', fontSize: '0.78rem' }}
                  onClick={() => applyPreset('bottom-left')}
                >
                  Góc Dưới Trái
                </button>
              </div>
            </div>

            {/* Mode selection */}
            <div className="card control-section">
              <span className="section-label">Phương Pháp Xóa</span>
              <div className="method-grid">
                <div
                  className={`method-card ${processMode === 'blur' ? 'active' : ''}`}
                  onClick={() => setProcessMode('blur')}
                >
                  <div className="method-card-icon">
                    <Layers size={18} />
                  </div>
                  <div className="method-card-body">
                    <div className="method-card-title">Làm Mờ Viền Mềm (Stepped Blur)</div>
                    <div className="method-card-desc">
                      Làm mờ chuyển tiếp 2 tầng (vùng đệm nhẹ + lõi che sâu) giúp hòa tan hoàn toàn viền chữ nhật. (Khuyên dùng)
                    </div>
                  </div>
                </div>

                <div
                  className={`method-card ${processMode === 'delogo' ? 'active' : ''}`}
                  onClick={() => setProcessMode('delogo')}
                >
                  <div className="method-card-icon">
                    <Wand2 size={18} />
                  </div>
                  <div className="method-card-body">
                    <div className="method-card-title">Nội Suy Viền (Delogo)</div>
                    <div className="method-card-desc">
                      Nội suy pixel từ dải viền xung quanh (phù hợp logo nhỏ nằm giữa video trên nền đồng màu).
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fine-tuning Sliders */}
            <div className="card control-section">
              <span className="section-label">Tinh Chỉnh Độ Mịn & Viền Mờ</span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <label htmlFor="feather-slider" style={{ color: 'var(--text-secondary)' }}>Độ mờ viền (Feathering):</label>
                  <span className="range-val">{featherRadius}px</span>
                </div>
                <div className="range-wrapper">
                  <input
                    id="feather-slider"
                    type="range"
                    min="4"
                    max="28"
                    value={featherRadius}
                    onChange={(e) => setFeatherRadius(Number(e.target.value))}
                    className="range-slider"
                  />
                </div>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)' }}>
                  Hòa tan viền chuyển tiếp mượt mà vào nền video xung quanh để triệt tiêu hoàn toàn vết khung viền.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <label htmlFor="blur-slider" style={{ color: 'var(--text-secondary)' }}>Cường độ làm mờ (Blur Radius):</label>
                  <span className="range-val">{blurRadius}</span>
                </div>
                <div className="range-wrapper">
                  <input
                    id="blur-slider"
                    type="range"
                    min="8"
                    max="32"
                    value={blurRadius}
                    onChange={(e) => setBlurRadius(Number(e.target.value))}
                    className="range-slider"
                  />
                </div>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)' }}>
                  Mức độ làm nhòe bên trong vùng watermark (cao hơn = che sạch chữ và logo đậm).
                </span>
              </div>
            </div>

            {/* Process Action */}
            <div className="card control-section">
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px' }}
                onClick={handleProcessVideo}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><RefreshCw size={18} className="animate-spin" /> Đang Xử Lý Video...</>
                ) : (
                  <><Wand2 size={18} /> Xóa Watermark Video</>
                )}
              </button>
            </div>

            {/* Result Video Preview and Download in Sidebar */}
            {resultVideoUrl && (
              <div className="card control-section">
                <span className="section-label">Video Đã Xóa Watermark</span>
                <video
                  src={resultVideoUrl}
                  controls
                  playsInline
                  preload="auto"
                  style={{
                    width: '100%',
                    borderRadius: 'var(--radius-sm)',
                    maxHeight: '200px',
                    background: '#000000',
                    display: 'block'
                  }}
                />
                <a
                  href={resultVideoUrl}
                  download={`watermark_removed_${Date.now()}.mp4`}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    padding: '11px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderColor: '#10b981',
                    fontSize: '0.85rem'
                  }}
                >
                  <Download size={16} /> Tải Video Đầy Đủ (MP4)
                </a>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '8px', padding: '10px', fontSize: '0.85rem' }}
                  onClick={() => {
                    const el = document.getElementById('video-trimmer-studio');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Scissors size={16} color="var(--accent-primary)" /> Cắt Đoạn Video Này
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Full-width Interactive Video Trimmer Studio */}
        {resultVideoUrl && (
          <div
            id="video-trimmer-studio"
            className="card"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            {/* Studio Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary)'
                  }}
                >
                  <Scissors size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Cắt Video (Sau Khi Đã Xóa Watermark)
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Chọn mốc thời gian bắt đầu & kết thúc, xem thử khung hình và xuất đoạn video mong muốn bằng FFmpeg WASM.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={resultVideoUrl}
                  download={`watermark_removed_${Date.now()}.mp4`}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  <Download size={16} /> Tải Video Gốc ({((resultBlob?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                </a>
              </div>
            </div>

            {/* Trimmer Workspace Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {/* Left Column: Player & Playhead Tracker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000000', boxShadow: 'var(--shadow-md)' }}>
                  <video
                    ref={resultVideoRef}
                    src={resultVideoUrl}
                    controls
                    playsInline
                    preload="auto"
                    onLoadedMetadata={handleResultLoadedMetadata}
                    onTimeUpdate={handleResultTimeUpdate}
                    style={{ width: '100%', maxHeight: '380px', display: 'block' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span>
                    ⏱️ Thời điểm hiện tại: <strong style={{ color: 'var(--text-primary)' }}>{formatTime(currentTime)}</strong> / {formatTime(videoDuration)}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                    Tổng thời lượng: {(videoDuration || 0).toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Right Column: Trim Controls & Actions */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  background: 'var(--bg-surface-elevated)',
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {/* Visual Timeline Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Đoạn cắt đã chọn:</span>
                    <span style={{ color: 'var(--accent-secondary)', fontWeight: 700 }}>
                      {formatTime(trimStart)} ➜ {formatTime(trimEnd)} ({Math.max(0, trimEnd - trimStart).toFixed(1)} giây)
                    </span>
                  </div>

                  <div style={{ position: 'relative', height: '16px', background: 'var(--bg-deep)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-medium)' }}>
                    {/* Active Trimmed Zone */}
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
                    {/* Playhead indicator */}
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
                </div>

                {/* Start Marker Controller */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <label style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color="#6366f1" /> Điểm Bắt Đầu (Start):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        onClick={() => updateTrimStart(trimStart - 0.5)}
                        title="Lùi 0.5 giây"
                      >
                        -0.5s
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        onClick={() => updateTrimStart(trimStart + 0.5)}
                        title="Tiến 0.5 giây"
                      >
                        +0.5s
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '0.72rem', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                        onClick={setTrimStartToCurrent}
                        title="Đặt mốc bắt đầu tại thời điểm video đang dừng"
                      >
                        ⏱️ Đặt mốc hiện tại
                      </button>
                      <span className="range-val" style={{ minWidth: '48px', textAlign: 'right' }}>
                        {trimStart.toFixed(1)}s
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={videoDuration || 10}
                    step="0.1"
                    value={trimStart}
                    onChange={(e) => updateTrimStart(Number(e.target.value))}
                    className="range-slider"
                  />
                </div>

                {/* End Marker Controller */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <label style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color="#06b6d4" /> Điểm Kết Thúc (End):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        onClick={() => updateTrimEnd(trimEnd - 0.5)}
                        title="Lùi 0.5 giây"
                      >
                        -0.5s
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        onClick={() => updateTrimEnd(trimEnd + 0.5)}
                        title="Tiến 0.5 giây"
                      >
                        +0.5s
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '0.72rem', color: '#22d3ee', borderColor: 'rgba(6, 182, 212, 0.4)' }}
                        onClick={setTrimEndToCurrent}
                        title="Đặt mốc kết thúc tại thời điểm video đang dừng"
                      >
                        ⏱️ Đặt mốc hiện tại
                      </button>
                      <span className="range-val" style={{ minWidth: '48px', textAlign: 'right' }}>
                        {trimEnd.toFixed(1)}s
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={videoDuration || 10}
                    step="0.1"
                    value={trimEnd}
                    onChange={(e) => updateTrimEnd(Number(e.target.value))}
                    className="range-slider"
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '11px', fontSize: '0.85rem' }}
                    onClick={previewTrimSegment}
                    disabled={isTrimming || isLoading}
                  >
                    <Play size={16} /> Xem Thử Đoạn Cắt
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1.2, padding: '11px', fontSize: '0.85rem' }}
                    onClick={handleTrimVideo}
                    disabled={isTrimming || isLoading || trimEnd <= trimStart}
                  >
                    {isTrimming ? (
                      <><RefreshCw size={16} className="animate-spin" /> Đang Cắt Video...</>
                    ) : (
                      <><Scissors size={16} /> Cắt & Xuất Video</>
                    )}
                  </button>
                </div>

                {/* Trimmed Video Result Card */}
                {trimmedVideoUrl && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '16px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Check size={18} /> Đã Cắt Video Thành Công ({trimmedDuration.toFixed(1)}s)
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        Dung lượng: {(trimmedSize / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>

                    <video
                      src={trimmedVideoUrl}
                      controls
                      playsInline
                      style={{
                        width: '100%',
                        maxHeight: '200px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#000000',
                        display: 'block'
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
                        fontSize: '0.9rem'
                      }}
                    >
                      <Download size={18} /> Tải Đoạn Video Đã Cắt Về Máy
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
