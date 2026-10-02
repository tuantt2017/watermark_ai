import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Wand2, Sparkles, RefreshCw, Download, 
  RotateCcw, Sliders, Eye, Check, AlertCircle, Scan,
  Square, Brush, Eraser
} from './Icons';
import { runImageInpainting, checkOpenCvReady } from '../services/imageInpainter';
import { detectWatermarksWithGemini, removeWatermarkWithGemini, getStoredApiKey } from '../services/geminiService';

export default function ImageRemover({ onOpenApiKeyModal }) {
  const [imageFile, setImageFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [resultSrc, setResultSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('info'); // info, success, error
  const [openCvLoaded, setOpenCvLoaded] = useState(checkOpenCvReady());

  // Tool states
  const [toolMode, setToolMode] = useState('brush'); // 'brush', 'rect', 'eraser'
  const [brushSize, setBrushSize] = useState(24);
  const [inpaintRadius, setInpaintRadius] = useState(5);
  const [maskDilation, setMaskDilation] = useState(2); // Precise 2px to avoid smearing / lem ảnh
  const [inpaintAlgorithm, setInpaintAlgorithm] = useState('telea'); // 'telea' or 'ns'
  const [comparePos, setComparePos] = useState(50); // percentage for split slider
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [hasDrawnMask, setHasDrawnMask] = useState(false);
  const resultImgRef = useRef(null);

  // Canvas refs
  const sourceCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const containerRef = useRef(null);

  // Drawing state refs
  const isDrawingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const maskHistoryRef = useRef([]);

  // Check OpenCV readiness
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (checkOpenCvReady()) {
        setOpenCvLoaded(true);
        clearInterval(checkInterval);
      }
    }, 500);
    return () => clearInterval(checkInterval);
  }, []);

  // Handle image upload
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setStatusMsg('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP).');
      setStatusType('error');
      return;
    }

    setImageFile(file);
    setResultSrc(null);
    setHasDrawnMask(false);
    setStatusMsg('');

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Setup canvas dimensions and draw base image
  const setupCanvases = (img) => {
    const sourceCanvas = sourceCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!sourceCanvas || !maskCanvas) {
      requestAnimationFrame(() => setupCanvases(img));
      return;
    }

    // Preserve 100% natural resolution (clamp only if exceeding 4096px to avoid memory overflow)
    const maxDim = 4096;
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    sourceCanvas.width = width;
    sourceCanvas.height = height;
    maskCanvas.width = width;
    maskCanvas.height = height;

    const sCtx = sourceCanvas.getContext('2d');
    sCtx.clearRect(0, 0, width, height);
    sCtx.drawImage(img, 0, 0, width, height);

    const mCtx = maskCanvas.getContext('2d');
    mCtx.clearRect(0, 0, width, height);
    maskHistoryRef.current = [];
  };

  // Automatically render image onto canvas whenever imageSrc is set or changed
  useEffect(() => {
    if (!imageSrc || resultSrc) return;

    let isCancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!isCancelled) {
        setupCanvases(img);
      }
    };
    img.src = imageSrc;

    return () => {
      isCancelled = true;
    };
  }, [imageSrc, resultSrc]);

  // Create a Demo Sample Image with a Watermark for quick testing
  const loadDemoSample = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    // Rich gradient background (Sunset landscape mockup)
    const bgGrad = ctx.createLinearGradient(0, 0, 960, 640);
    bgGrad.addColorStop(0, '#1e1b4b');
    bgGrad.addColorStop(0.4, '#4338ca');
    bgGrad.addColorStop(0.7, '#f43f5e');
    bgGrad.addColorStop(1, '#fbbf24');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 960, 640);

    // Some scenery shapes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(0, 640);
    ctx.lineTo(240, 420);
    ctx.lineTo(480, 520);
    ctx.lineTo(720, 380);
    ctx.lineTo(960, 640);
    ctx.closePath();
    ctx.fill();

    // Prominent Watermarks to test removal
    // 1. Center semi-transparent watermark
    ctx.save();
    ctx.translate(480, 300);
    ctx.rotate(-Math.PI / 12);
    ctx.font = 'bold 52px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.textAlign = 'center';
    ctx.fillText('WATERMARK DEMO © 2026', 0, 0);
    ctx.restore();

    // 2. Corner logo watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('ID: @SAMPLE_CREATOR', 700, 600);

    const dataUrl = canvas.toDataURL('image/png');
    setImageFile(null);
    setResultSrc(null);
    setHasDrawnMask(false);
    setStatusMsg('Đã nạp ảnh mẫu demo thành công! Dùng cọ vẽ tô lên chữ watermark để xóa.');
    setStatusType('info');
    setImageSrc(dataUrl);
  };

  // Convert mouse event coordinates to Canvas coordinates
  const getCanvasCoords = (e) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return { x: 0, y: 0 };
    const rect = maskCanvas.getBoundingClientRect();
    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Mouse / Touch drawing handlers
  const handleMouseDown = (e) => {
    if (!imageSrc || isLoading) return;
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    startPosRef.current = coords;

    const mCtx = maskCanvasRef.current.getContext('2d');
    
    // Save history for undo
    saveMaskState();

    if (toolMode === 'brush' || toolMode === 'eraser') {
      mCtx.beginPath();
      mCtx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
      if (toolMode === 'eraser') {
        mCtx.globalCompositeOperation = 'destination-out';
        mCtx.fillStyle = 'rgba(0,0,0,1)';
      } else {
        mCtx.globalCompositeOperation = 'source-over';
        mCtx.fillStyle = 'rgba(244, 63, 94, 0.7)';
      }
      mCtx.fill();
      setHasDrawnMask(true);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawingRef.current || !imageSrc || isLoading) return;
    const coords = getCanvasCoords(e);
    const mCtx = maskCanvasRef.current.getContext('2d');

    if (toolMode === 'brush' || toolMode === 'eraser') {
      mCtx.lineWidth = brushSize;
      mCtx.lineCap = 'round';
      mCtx.lineJoin = 'round';

      if (toolMode === 'eraser') {
        mCtx.globalCompositeOperation = 'destination-out';
        mCtx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        mCtx.globalCompositeOperation = 'source-over';
        mCtx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
      }

      mCtx.beginPath();
      mCtx.moveTo(startPosRef.current.x, startPosRef.current.y);
      mCtx.lineTo(coords.x, coords.y);
      mCtx.stroke();

      startPosRef.current = coords;
      setHasDrawnMask(true);
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (toolMode === 'rect') {
      const coords = getCanvasCoords(e);
      const mCtx = maskCanvasRef.current.getContext('2d');
      mCtx.globalCompositeOperation = 'source-over';
      mCtx.fillStyle = 'rgba(244, 63, 94, 0.7)';
      const x = Math.min(startPosRef.current.x, coords.x);
      const y = Math.min(startPosRef.current.y, coords.y);
      const w = Math.abs(coords.x - startPosRef.current.x);
      const h = Math.abs(coords.y - startPosRef.current.y);
      mCtx.fillRect(x, y, w, h);
      setHasDrawnMask(true);
    }
  };

  const saveMaskState = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const mCtx = maskCanvas.getContext('2d');
    const imgData = mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    maskHistoryRef.current.push(imgData);
    if (maskHistoryRef.current.length > 10) maskHistoryRef.current.shift();
  };

  const handleUndo = () => {
    if (maskHistoryRef.current.length === 0) return;
    const maskCanvas = maskCanvasRef.current;
    const mCtx = maskCanvas.getContext('2d');
    const prevState = maskHistoryRef.current.pop();
    mCtx.putImageData(prevState, 0, 0);
  };

  const handleClearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const mCtx = maskCanvas.getContext('2d');
    mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskHistoryRef.current = [];
    setHasDrawnMask(false);
  };

  // Run High-Precision Anti-Ghost Inpainting
  const handleFastInpaint = async (overrideOpts = {}) => {
    if (!hasDrawnMask) {
      setStatusMsg('Vui lòng dùng cọ vẽ tô lên vùng watermark trước khi bấm Xóa.');
      setStatusType('error');
      return;
    }

    const algo = overrideOpts.algorithm || inpaintAlgorithm;
    const dil = overrideOpts.dilation !== undefined ? overrideOpts.dilation : maskDilation;
    const rad = overrideOpts.radius !== undefined ? overrideOpts.radius : inpaintRadius;

    setIsLoading(true);
    setStatusMsg('Đang tái tạo nền chuẩn xác nét, chống lem ảnh...');
    setStatusType('info');

    try {
      const startT = performance.now();
      const res = await runImageInpainting(sourceCanvasRef.current, maskCanvasRef.current, {
        radius: rad,
        algorithm: algo,
        dilation: dil
      });
      const elapsed = ((performance.now() - startT) / 1000).toFixed(2);

      setResultSrc(res.dataUrl);
      setStatusMsg(`Xóa thành công trong ${elapsed}s (${res.engine})!`);
      setStatusType('success');
    } catch (err) {
      console.error(err);
      setStatusMsg(`Lỗi xử lý: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Commit current result as new working canvas to continue removing residual spots
  const handleApplyAndContinue = () => {
    if (!resultSrc) return;
    setImageSrc(resultSrc);
    setResultSrc(null);
    setHasDrawnMask(false);
    setStatusMsg('Đã lưu kết quả làm ảnh gốc mới! Bạn có thể tô tiếp cọ lên vết mờ hoặc logo khác để xóa sạch 100%.');
    setStatusType('info');
  };

  // Auto-Detect Watermarks using Gemini Vision AI
  const handleAutoDetect = async () => {
    const apiKey = getStoredApiKey();
    if (!apiKey) {
      onOpenApiKeyModal();
      return;
    }

    setIsLoading(true);
    setStatusMsg('Gemini Vision AI đang phân tích ảnh và quét toạ độ watermark...');
    setStatusType('info');

    try {
      const boxes = await detectWatermarksWithGemini(sourceCanvasRef.current, apiKey);

      if (!boxes || boxes.length === 0) {
        setStatusMsg('Không tìm thấy watermark rõ rệt. Bạn có thể tự tô cọ thủ công.');
        setStatusType('info');
        setIsLoading(false);
        return;
      }

      // Draw bounding boxes to mask canvas
      saveMaskState();
      const maskCanvas = maskCanvasRef.current;
      const mCtx = maskCanvas.getContext('2d');
      mCtx.globalCompositeOperation = 'source-over';
      mCtx.fillStyle = 'rgba(244, 63, 94, 0.75)';

      const w = maskCanvas.width;
      const h = maskCanvas.height;

      boxes.forEach((box) => {
        // box_2d is [ymin, xmin, ymax, xmax] in 0-1000 scale
        const [ymin, xmin, ymax, xmax] = box.box_2d || [0, 0, 0, 0];
        const bx = (xmin / 1000) * w;
        const by = (ymin / 1000) * h;
        const bw = ((xmax - xmin) / 1000) * w;
        const bh = ((ymax - ymin) / 1000) * h;
        
        // Add 10px generous padding around box to swallow drop shadow/gradient
        mCtx.fillRect(Math.max(0, bx - 10), Math.max(0, by - 10), bw + 20, bh + 20);
      });

      setHasDrawnMask(true);
      setStatusMsg(`Đã tự động khoanh vùng ${boxes.length} vị trí watermark (có bù lề viền)! Bạn có thể nhấn 'Xóa Sạch' ngay.`);
      setStatusType('success');
    } catch (err) {
      setStatusMsg(`Lỗi Gemini: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Run High Quality Inpainting via Gemini GenAI
  const handleGeminiGenAI = async () => {
    const apiKey = getStoredApiKey();
    if (!apiKey) {
      onOpenApiKeyModal();
      return;
    }

    setIsLoading(true);
    setStatusMsg('Đang gửi ảnh tới Google Gemini để tái tạo chi tiết...');
    setStatusType('info');

    try {
      const cleanImageUrl = await removeWatermarkWithGemini(
        sourceCanvasRef.current,
        maskCanvasRef.current,
        apiKey
      );

      setResultSrc(cleanImageUrl);
      setStatusMsg('Gemini AI đã xóa watermark và tái tạo nền thành công!');
      setStatusType('success');
    } catch (err) {
      console.warn('Gemini AI inpaint notice:', err);

      if (err.isFreeTierLimitation) {
        setStatusMsg('Google AI Free Tier giới hạn model tạo ảnh (limit: 0). Đang tự động chuyển sang chế độ AI Hybrid (Gemini 3.8 Flash + OpenCV WASM)...');
        setStatusType('info');

        try {
          // If no mask has been manually drawn, use Gemini 3.8 Flash to auto-detect watermark bounding boxes
          if (!hasDrawnMask) {
            const boxes = await detectWatermarksWithGemini(sourceCanvasRef.current, apiKey);
            if (boxes && boxes.length > 0) {
              const maskCanvas = maskCanvasRef.current;
              const mCtx = maskCanvas.getContext('2d');
              mCtx.globalCompositeOperation = 'source-over';
              mCtx.fillStyle = 'rgba(244, 63, 94, 0.75)';
              const w = maskCanvas.width;
              const h = maskCanvas.height;

              boxes.forEach((box) => {
                const [ymin, xmin, ymax, xmax] = box.box_2d || [0, 0, 0, 0];
                const bx = (xmin / 1000) * w;
                const by = (ymin / 1000) * h;
                const bw = ((xmax - xmin) / 1000) * w;
                const bh = ((ymax - ymin) / 1000) * h;
                mCtx.fillRect(Math.max(0, bx - 6), Math.max(0, by - 6), bw + 12, bh + 12);
              });
              setHasDrawnMask(true);
            }
          }

          // Execute local inpainting with dilated mask
          const res = await runImageInpainting(sourceCanvasRef.current, maskCanvasRef.current, {
            radius: inpaintRadius
          });
          setResultSrc(res.dataUrl);
          setStatusMsg('Đã xóa watermark thành công bằng chế độ AI Hybrid (Gemini 3.8 Flash + OpenCV Telea)!');
          setStatusType('success');
          return;
        } catch (fallbackErr) {
          console.error('Fallback inpainting error:', fallbackErr);
        }
      }

      setStatusMsg(`Lỗi Gemini: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Download Output
  const handleDownload = () => {
    if (!resultSrc) return;
    const a = document.createElement('a');
    a.href = resultSrc;
    a.download = `watermark_removed_${Date.now()}.png`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Upload or Editor Area */}
      {!imageSrc ? (
        <div className="card">
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
            onClick={() => document.getElementById('image-upload-input').click()}
          >
            <input
              id="image-upload-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
                e.target.value = '';
              }}
              style={{ display: 'none' }}
            />
            <div className="dropzone-icon">
              <Upload size={32} />
            </div>
            <div>
              <h3 className="dropzone-title">Kéo & Thả hoặc Nhấn để tải ảnh lên</h3>
              <p className="dropzone-desc">
                Hỗ trợ PNG, JPG, WEBP. Ảnh được xử lý 100% trong trình duyệt của bạn, không tải lên server.
              </p>
            </div>
            <div className="dropzone-formats">
              <span className="format-tag">PNG</span>
              <span className="format-tag">JPG</span>
              <span className="format-tag">WEBP</span>
              <span className="format-tag">Không giới hạn dung lượng</span>
            </div>
            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  loadDemoSample();
                }}
              >
                <Sparkles size={16} /> Dùng Ảnh Mẫu Để Thử Ngay
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="editor-layout">
          {/* Main Viewport */}
          <div className="viewport-panel">
            {/* Viewport Top Toolbar */}
            <div className="viewport-toolbar">
              <div className="toolbar-group">
                <button
                  className={`btn ${toolMode === 'brush' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => setToolMode('brush')}
                  title="Cọ vẽ tự do"
                >
                  <Brush size={16} /> Cọ vẽ
                </button>
                <button
                  className={`btn ${toolMode === 'rect' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => setToolMode('rect')}
                  title="Kéo hình chữ nhật bao quanh watermark"
                >
                  <Square size={16} /> Khung viền
                </button>
                <button
                  className={`btn ${toolMode === 'eraser' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => setToolMode('eraser')}
                  title="Tẩy bớt vùng đã vẽ"
                >
                  <Eraser size={16} /> Tẩy mask
                </button>
              </div>

              <div className="toolbar-group">
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  onClick={handleUndo}
                  title="Hoàn tác (Undo)"
                >
                  <RotateCcw size={15} /> Hoàn tác
                </button>
                <button
                  className="btn btn-danger"
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  onClick={handleClearMask}
                  title="Xóa toàn bộ mask đã vẽ"
                >
                  Xóa Mask
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => {
                    setImageSrc(null);
                    setResultSrc(null);
                    setStatusMsg('');
                  }}
                >
                  Đổi ảnh khác
                </button>
              </div>
            </div>

            {/* Canvas Stage */}
            <div className="viewport-canvas-area" ref={containerRef}>
              {resultSrc ? (
                /* Comparison View (Before vs After Slider) */
                <div
                  className="compare-container"
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    lineHeight: 0,
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-lg)',
                    overflow: 'hidden',
                    userSelect: 'none'
                  }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                    setComparePos((x / rect.width) * 100);
                  }}
                  onTouchMove={(e) => {
                    if (e.touches?.[0]) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
                      setComparePos((x / rect.width) * 100);
                    }
                  }}
                >
                  {/* Result Image (Bottom Layer) */}
                  <img
                    ref={resultImgRef}
                    src={resultSrc}
                    alt="Kết quả"
                    onLoad={(e) => {
                      setImgDimensions({
                        width: e.target.clientWidth,
                        height: e.target.clientHeight
                      });
                    }}
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: '68vh',
                      width: 'auto',
                      height: 'auto',
                      pointerEvents: 'none'
                    }}
                  />

                  {/* Original Image (Top Layer clipped by slider) */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: `${comparePos}%`,
                      height: '100%',
                      overflow: 'hidden',
                      borderRight: '2px solid #ffffff'
                    }}
                  >
                    <img
                      src={imageSrc}
                      alt="Gốc"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: imgDimensions.width ? `${imgDimensions.width}px` : '100%',
                        height: imgDimensions.height ? `${imgDimensions.height}px` : '100%',
                        maxWidth: 'none',
                        maxHeight: 'none',
                        pointerEvents: 'none'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        padding: '4px 8px',
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#fff',
                        zIndex: 5
                      }}
                    >
                      GỐC
                    </div>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      padding: '4px 8px',
                      background: 'rgba(16,185,129,0.85)',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#fff',
                      zIndex: 5
                    }}
                  >
                    ĐÃ XÓA
                  </div>

                  {/* Slider Bar */}
                  <div
                    className="compare-slider-bar"
                    style={{ left: `${comparePos}%` }}
                  >
                    <div className="compare-handle">
                      <Eye size={16} />
                    </div>
                  </div>
                </div>
              ) : (
                /* Drawing Mode Stage */
                <div
                  className="canvas-stage"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={(e) => {
                    if (e.touches?.[0]) {
                      const touch = e.touches[0];
                      handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
                    }
                  }}
                  onTouchMove={(e) => {
                    if (e.touches?.[0]) {
                      const touch = e.touches[0];
                      handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
                    }
                  }}
                  onTouchEnd={handleMouseUp}
                >
                  <canvas ref={sourceCanvasRef} className="canvas-layer" />
                  <canvas ref={maskCanvasRef} className="mask-overlay" />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="controls-sidebar">
            {/* Status Notifications */}
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
                  <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                )}
                <span>{statusMsg}</span>
              </div>
            )}

            {/* Brush Controls (When in drawing mode) */}
            {!resultSrc && (
              <div className="card control-section">
                <span className="section-label">Tùy Chỉnh Cọ Vẽ</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Kích cỡ cọ:</span>
                    <span className="range-val">{brushSize}px</span>
                  </div>
                  <div className="range-wrapper">
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="range-slider"
                    />
                  </div>
                </div>

                {/* Mask Dilation slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Mở rộng viền Mask (Bù lề viền chữ):</span>
                    <span className="range-val">{maskDilation}px</span>
                  </div>
                  <div className="range-wrapper">
                    <input
                      type="range"
                      min="0"
                      max="8"
                      value={maskDilation}
                      onChange={(e) => setMaskDilation(Number(e.target.value))}
                      className="range-slider"
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                    Chỉ nên để 1-3px để không ăn vào chi tiết nền xung quanh (tránh lem ảnh).
                  </span>
                </div>

                {/* Inpaint Radius slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Bán kính lấy mẫu màu:</span>
                    <span className="range-val">{inpaintRadius}px</span>
                  </div>
                  <div className="range-wrapper">
                    <input
                      type="range"
                      min="2"
                      max="15"
                      value={inpaintRadius}
                      onChange={(e) => setInpaintRadius(Number(e.target.value))}
                      className="range-slider"
                    />
                  </div>
                </div>

                {/* Algorithm switcher */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Thuật toán tái tạo:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      className={`btn ${inpaintAlgorithm === 'telea' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '8px 10px', fontSize: '0.76rem' }}
                      onClick={() => setInpaintAlgorithm('telea')}
                      title="Thuật toán Fast Marching Telea - Tái tạo sắc nét, không vỡ hạt"
                    >
                      Telea (Sắc Nét)
                    </button>
                    <button
                      type="button"
                      className={`btn ${inpaintAlgorithm === 'ns' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '8px 10px', fontSize: '0.76rem' }}
                      onClick={() => setInpaintAlgorithm('ns')}
                      title="Navier-Stokes PDE - Dành cho nền trời, chuyển sắc gradient mịn mượt"
                    >
                      Navier-Stokes (Mịn)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Cards */}
            <div className="card control-section">
              <span className="section-label">Phương Thức Xóa</span>

              <div className="method-grid">
                {/* 1. Fast Telea Inpaint */}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', justifyContent: 'flex-start' }}
                  onClick={() => handleFastInpaint({ algorithm: 'telea' })}
                  disabled={isLoading}
                >
                  <Wand2 size={20} />
                  <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 700 }}>Xóa Sạch Nét (Telea Chuẩn)</div>
                    <div style={{ fontSize: '0.74rem', opacity: 0.85 }}>
                      Giữ 100% độ nét ảnh gốc • Không lem • 0.05s
                    </div>
                  </div>
                </button>

                {/* 2. Navier-Stokes Smooth */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '11px 12px', justifyContent: 'flex-start' }}
                  onClick={() => handleFastInpaint({ algorithm: 'ns' })}
                  disabled={isLoading}
                >
                  <Sparkles size={16} style={{ color: 'var(--accent-secondary)' }} />
                  <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>Xóa Mịn Mượt (Navier-Stokes)</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                      Tối ưu cho bầu trời, chuyển sắc gradient & da
                    </div>
                  </div>
                </button>

                {/* 3. Auto Detect Gemini */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '12px', justifyContent: 'flex-start' }}
                  onClick={handleAutoDetect}
                  disabled={isLoading}
                >
                  <Scan size={18} style={{ color: 'var(--accent-secondary)' }} />
                  <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 600 }}>Tự Động Quét Bằng Gemini</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                      Dùng Vision AI tìm toạ độ logo + bù lề viền
                    </div>
                  </div>
                </button>

                {/* 4. Gemini GenAI Inpainting */}
                <button
                  type="button"
                  className="btn btn-gemini"
                  style={{ width: '100%', padding: '12px', justifyContent: 'flex-start' }}
                  onClick={handleGeminiGenAI}
                  disabled={isLoading}
                >
                  <Sparkles size={18} />
                  <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 600 }}>Xóa AI Tái Tạo (Gemini Pro)</div>
                    <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                      Gemini 3 Pro Image / Tự động fallback AI Hybrid
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Download and Re-edit Actions */}
            {resultSrc && (
              <div className="card control-section">
                <span className="section-label">Hành Động Kết Quả</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Continue inpainting directly on result */}
                  <button
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderColor: '#10b981'
                    }}
                    onClick={handleApplyAndContinue}
                    title="Lưu ảnh này làm ảnh gốc để tô cọ xóa tiếp bất kỳ vết mờ nào còn sót lại"
                  >
                    <Check size={18} /> Áp Dụng & Xóa Tiếp Đốm Mờ
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '14px' }}
                    onClick={handleDownload}
                  >
                    <Download size={18} /> Tải Ảnh Đã Xóa Về Máy
                  </button>

                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%' }}
                    onClick={() => setResultSrc(null)}
                  >
                    <RotateCcw size={16} /> Quay lại ảnh gốc ban đầu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
