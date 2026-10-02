/**
 * Video Processing Service via FFmpeg.wasm
 * Runs 100% in browser Web Worker without any backend.
 * Uses Single-Input Stepped Feathered Blur and Optimized Delogo.
 * Zero external image dependencies to prevent WebAssembly memory heap overflows.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance = null;
let isLoading = false;
let lastFfmpegLogs = [];

/**
 * Initialize FFmpeg instance with progress listener
 */
export const initFFmpeg = async (onLoadStatus = () => {}, onProgress = () => {}) => {
  if (ffmpegInstance) return ffmpegInstance;
  if (isLoading) {
    while (isLoading) {
      await new Promise(r => setTimeout(r, 200));
    }
    return ffmpegInstance;
  }

  isLoading = true;
  onLoadStatus('Đang nạp bộ xử lý video WebAssembly...');

  try {
    const ffmpeg = new FFmpeg();

    ffmpeg.on('progress', ({ progress }) => {
      const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
      onProgress(pct);
    });

    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg WASM]', message);
      lastFfmpegLogs.push(message);
      if (lastFfmpegLogs.length > 50) lastFfmpegLogs.shift();
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    onLoadStatus('Bộ vi xử lý WebAssembly đã sẵn sàng!');
    return ffmpegInstance;
  } catch (err) {
    console.error('Failed to load FFmpeg WASM:', err);
    ffmpegInstance = null;
    throw new Error('Không thể tải thư viện WebAssembly. Vui lòng kiểm tra kết nối internet.');
  } finally {
    isLoading = false;
  }
};

/**
 * Remove watermark from video using FFmpeg
 * @param {File} videoFile 
 * @param {Object} coords { x, y, width, height, videoWidth, videoHeight, displayWidth, displayHeight }
 * @param {Function} onProgress (percent 0-100)
 * @param {Function} onStatus (message string)
 * @param {Object|string} options { mode: 'blur'|'delogo', featherRadius: 14, blurRadius: 18 }
 * @returns {Promise<{ blob: Blob, url: string, size: number }>}
 */
export const removeVideoWatermark = async (
  videoFile,
  coords,
  onProgress = () => {},
  onStatus = () => {},
  options = {}
) => {
  lastFfmpegLogs = [];
  const ffmpeg = await initFFmpeg(onStatus, onProgress);

  const opts = typeof options === 'string' ? { mode: options } : (options || {});
  const mode = opts.mode || 'blur';
  const featherRadius = Number(opts.featherRadius) || 14;
  const blurRadius = Number(opts.blurRadius) || 18;

  onStatus('Đang nạp video vào bộ nhớ xử lý...');

  let ext = 'mp4';
  if (videoFile.name && videoFile.name.includes('.')) {
    const detected = videoFile.name.split('.').pop().toLowerCase();
    if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(detected)) {
      ext = detected;
    }
  } else if (videoFile.type) {
    if (videoFile.type.includes('webm')) ext = 'webm';
    else if (videoFile.type.includes('quicktime') || videoFile.type.includes('mov')) ext = 'mov';
    else if (videoFile.type.includes('mkv')) ext = 'mkv';
  }

  const timestamp = Date.now();
  const inputFileName = `input_${timestamp}.${ext}`;
  const outputFileName = `output_${timestamp}.mp4`;

  await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

  const displayW = Math.max(1, coords.displayWidth || coords.videoWidth || 640);
  const displayH = Math.max(1, coords.displayHeight || coords.videoHeight || 360);
  const vidW = Math.max(1, coords.videoWidth || displayW);
  const vidH = Math.max(1, coords.videoHeight || displayH);

  const scaleX = vidW / displayW;
  const scaleY = vidH / displayH;

  // Maximum even bounds for YUV420p & libx264
  const maxW = Math.floor(vidW / 2) * 2;
  const maxH = Math.floor(vidH / 2) * 2;

  // Helper to ensure strictly even numbers (divisible by 2)
  const toEven = (v) => {
    let n = Math.round(v);
    return n % 2 === 0 ? n : n - 1;
  };
  const toEvenDim = (v) => {
    let n = Math.round(v);
    if (n % 2 !== 0) n += 1;
    return Math.max(4, n);
  };

  // Base inner watermark coordinates
  let x2 = Math.max(0, toEven(coords.x * scaleX));
  let y2 = Math.max(0, toEven(coords.y * scaleY));
  if (x2 > maxW - 4) x2 = maxW - 4;
  if (y2 > maxH - 4) y2 = maxH - 4;

  let w2 = toEvenDim(coords.width * scaleX);
  let h2 = toEvenDim(coords.height * scaleY);

  if (x2 + w2 > maxW) w2 = toEven(maxW - x2);
  if (y2 + h2 > maxH) h2 = toEven(maxH - y2);
  w2 = Math.max(4, w2);
  h2 = Math.max(4, h2);

  // Stepped outer transition halo coordinates (expanded by even padding)
  const rawPad = Math.max(0, Math.min(14, Math.floor(featherRadius / 2)));
  const pad = Math.floor(rawPad / 2) * 2; // e.g. 4, 6, 8, 10, 12

  let x1 = Math.max(0, x2 - pad);
  let y1 = Math.max(0, y2 - pad);
  if (x1 % 2 !== 0) x1 -= 1;
  if (y1 % 2 !== 0) y1 -= 1;
  x1 = Math.max(0, x1);
  y1 = Math.max(0, y1);

  let w1 = w2 + (x2 - x1) + pad;
  let h1 = h2 + (y2 - y1) + pad;
  if (x1 + w1 > maxW) w1 = maxW - x1;
  if (y1 + h1 > maxH) h1 = maxH - y1;
  if (w1 % 2 !== 0) w1 -= 1;
  if (h1 % 2 !== 0) h1 -= 1;

  const canUseStepped = pad >= 4 && w1 > w2 && h1 > h2;

  console.log(`[VideoService] Core: (${x2},${y2},${w2}x${h2}), Halo: (${x1},${y1},${w1}x${h1}), Pad: ${pad}px`);

  // Helper to calculate safe boxblur parameters for YUV420p video
  // FFmpeg's boxblur filter strictly requires:
  // - luma_radius < min(crop_w, crop_h) / 2
  // - chroma_radius < (min(crop_w, crop_h) / 2) / 2 = min(crop_w, crop_h) / 4
  // If chroma_radius is omitted, FFmpeg copies luma_radius into chroma, which fails with EINVAL (-22):
  // "Invalid chroma_param radius value X, must be >= 0 and < Y".
  const getSafeBoxblur = (w, h, targetRadius, power = 2) => {
    const minDim = Math.min(w, h);
    const maxLuma = Math.max(0, Math.floor(minDim / 2) - 1);
    const maxChroma = Math.max(0, Math.floor(minDim / 4) - 1);

    const safeLuma = Math.min(maxLuma, Math.max(0, targetRadius));
    const safeChroma = Math.min(maxChroma, Math.max(0, Math.floor(safeLuma / 2)));
    const lp = safeLuma > 0 ? Math.max(1, power) : 0;
    const cp = safeChroma > 0 ? Math.max(1, power) : 0;

    return `boxblur=${safeLuma}:${lp}:${safeChroma}:${cp}`;
  };

  // Build filter graph
  // If canUseStepped: 2-stage transition zone (light blur halo + deep core blur)
  // This eliminates the sharp 90-degree rectangular cut completely!
  let blurFilter;
  if (canUseStepped) {
    const haloBlur = Math.max(2, Math.floor(blurRadius / 3));
    const haloBlurStr = getSafeBoxblur(w1, h1, haloBlur, 1);
    const coreBlurStr = getSafeBoxblur(w2, h2, blurRadius, 2);
    blurFilter = `[0:v]format=yuv420p,split=3[main][c_outer][c_inner];[c_outer]crop=${w1}:${h1}:${x1}:${y1},${haloBlurStr}[b_outer];[c_inner]crop=${w2}:${h2}:${x2}:${y2},${coreBlurStr}[b_inner];[main][b_outer]overlay=${x1}:${y1}[stage1];[stage1][b_inner]overlay=${x2}:${y2}[outv]`;
  } else {
    const coreBlurStr = getSafeBoxblur(w2, h2, blurRadius, 2);
    blurFilter = `[0:v]format=yuv420p,split=2[main][tocrop];[tocrop]crop=${w2}:${h2}:${x2}:${y2},${coreBlurStr}[blurred];[main][blurred]overlay=${x2}:${y2}[outv]`;
  }

  const blurArgs = [
    '-y',
    '-i', inputFileName,
    '-filter_complex', blurFilter,
    '-map', '[outv]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputFileName
  ];

  // Delogo filter: interpolation from surrounding pixels
  // Modern FFmpeg delogo supports: x, y, w, h, show (band was deprecated/removed)
  // delogo requires at least 1 pixel padding from boundaries to sample neighbors
  const canUseDelogo = (
    mode === 'delogo' &&
    x2 >= 1 &&
    y2 >= 1 &&
    (x2 + w2) <= (maxW - 1) &&
    (y2 + h2) <= (maxH - 1)
  );

  const delogoFilter = `[0:v]format=yuv420p,delogo=x=${x2}:y=${y2}:w=${w2}:h=${h2}:show=0[outv]`;
  const delogoArgs = [
    '-y',
    '-i', inputFileName,
    '-filter_complex', delogoFilter,
    '-map', '[outv]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputFileName
  ];

  onStatus(`Đang xử lý watermark video (${vidW}x${vidH})...`);

  try {
    let exitCode = -1;

    if (canUseDelogo) {
      onStatus('Đang áp dụng bộ lọc nội suy viền Delogo...');
      exitCode = await ffmpeg.exec(delogoArgs);

      if (exitCode !== 0) {
        console.warn('Delogo exited with code', exitCode, ', falling back to Stepped Blur...');
        onStatus('Đang chuyển sang bộ lọc Làm Mờ Viền Mềm (Stepped Blur)...');
        exitCode = await ffmpeg.exec(blurArgs);
      }
    } else {
      if (mode === 'delogo') {
        onStatus('Vùng chọn nằm sát mép viền video; sử dụng bộ lọc Làm Mờ Viền Mềm...');
      } else {
        onStatus('Đang áp dụng bộ lọc Làm Mờ Viền Mềm (Stepped Blur)...');
      }
      exitCode = await ffmpeg.exec(blurArgs);
    }

    // Audio-free fallback if audio encoding failed
    if (exitCode !== 0) {
      console.warn('Standard encoding failed, trying audio-free fallback...');
      onStatus('Đang thử chế độ xuất dự phòng...');
      exitCode = await ffmpeg.exec([
        '-y',
        '-i', inputFileName,
        '-filter_complex', blurFilter,
        '-map', '[outv]',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',
        '-an',
        outputFileName
      ]);
    }

    if (exitCode !== 0) {
      const errSnippet = lastFfmpegLogs.filter(l => /error|invalid|failed|not found|cannot/i.test(l)).slice(-3).join('; ');
      throw new Error(`FFmpeg báo lỗi xử lý (code ${exitCode}): ${errSnippet || 'Định dạng video hoặc vị trí không hợp lệ.'}`);
    }

    onStatus('Đang kiểm tra và đóng gói tệp video...');
    const data = await ffmpeg.readFile(outputFileName);

    if (!data || data.byteLength === 0) {
      throw new Error('Tệp video xuất ra bị rỗng (0 bytes). Vui lòng thử vị trí khung khác hoặc định dạng MP4 tiêu chuẩn.');
    }

    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);

    // Clean virtual WASM filesystem
    try {
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);
    } catch (e) {
      // ignore
    }

    onProgress(100);
    onStatus(`Xóa watermark video thành công! Dung lượng: ${(data.byteLength / 1024 / 1024).toFixed(2)} MB`);
    return { blob, url, size: data.byteLength };
  } catch (err) {
    console.error('FFmpeg processing error:', err);
    // If WebAssembly memory is corrupted or out of bounds, reset the instance
    if (err && (String(err).includes('memory') || String(err).includes('out of bounds') || String(err).includes('abort'))) {
      ffmpegInstance = null;
    }
    throw err;
  }
};

/**
 * Trims a video file or blob between startTime and endTime using FFmpeg WebAssembly.
 * 
 * @param {File|Blob|string} videoSource - Source video (Blob, File, or Blob URL)
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @param {function} onProgress - Progress callback (0-100)
 * @param {function} onStatus - Status message callback
 * @returns {Promise<{ blob: Blob, url: string, size: number, duration: number }>}
 */
export const getFFmpeg = initFFmpeg;

export const trimVideo = async (
  videoSource,
  startTime,
  endTime,
  onProgress = () => {},
  onStatus = () => {}
) => {
  lastFfmpegLogs = [];
  onStatus('Đang khởi chạy FFmpeg để cắt video...');
  const ffmpeg = await initFFmpeg(onStatus, onProgress);


  const timestamp = Date.now();
  let ext = 'mp4';
  if (videoSource instanceof File && videoSource.name) {
    const parts = videoSource.name.split('.');
    if (parts.length > 1) {
      ext = parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
    }
  } else if (videoSource instanceof Blob && videoSource.type) {
    if (videoSource.type.includes('webm')) ext = 'webm';
    else if (videoSource.type.includes('quicktime')) ext = 'mov';
    else if (videoSource.type.includes('x-matroska') || videoSource.type.includes('mkv')) ext = 'mkv';
  }

  const inputFileName = `trim_in_${timestamp}.${ext}`;
  const outputFileName = `trim_out_${timestamp}.mp4`;

  let fileData;
  if (typeof videoSource === 'string') {
    fileData = await fetchFile(videoSource);
  } else if (videoSource instanceof Blob || videoSource instanceof File) {
    fileData = await fetchFile(videoSource);
  } else {
    throw new Error('Dữ liệu video không hợp lệ để thực hiện cắt.');
  }

  await ffmpeg.writeFile(inputFileName, fileData);

  const startSec = Math.max(0, Number(startTime) || 0);
  const endSec = Math.max(startSec + 0.1, Number(endTime) || (startSec + 1));
  const trimDuration = endSec - startSec;

  onStatus(`Đang cắt video từ ${startSec.toFixed(1)}s đến ${endSec.toFixed(1)}s (thời lượng: ${trimDuration.toFixed(1)}s)...`);
  onProgress(25);

  const trimArgs = [
    '-y',
    '-ss', startSec.toFixed(2),
    '-to', endSec.toFixed(2),
    '-i', inputFileName,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputFileName
  ];

  try {
    let exitCode = await ffmpeg.exec(trimArgs);

    // Audio-free fallback if the input video has non-standard or missing audio
    if (exitCode !== 0) {
      console.warn('Trim with audio failed, attempting audio-free trim...');
      onStatus('Đang thử chế độ cắt không âm thanh...');
      exitCode = await ffmpeg.exec([
        '-y',
        '-ss', startSec.toFixed(2),
        '-to', endSec.toFixed(2),
        '-i', inputFileName,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',
        '-an',
        outputFileName
      ]);
    }

    if (exitCode !== 0) {
      const errSnippet = lastFfmpegLogs.filter(l => /error|invalid|failed|not found|cannot/i.test(l)).slice(-3).join('; ');
      throw new Error(`FFmpeg báo lỗi cắt video (code ${exitCode}): ${errSnippet || 'Mốc thời gian cắt không hợp lệ.'}`);
    }

    onStatus('Đang kiểm tra và đóng gói đoạn video đã cắt...');
    const data = await ffmpeg.readFile(outputFileName);

    if (!data || data.byteLength === 0) {
      throw new Error('Tệp video sau khi cắt bị rỗng (0 bytes). Vui lòng kiểm tra lại mốc thời gian bắt đầu và kết thúc.');
    }

    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);

    try {
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);
    } catch (e) {
      // ignore
    }

    onProgress(100);
    onStatus(`Cắt video thành công! Thời lượng: ${trimDuration.toFixed(1)}s (Dung lượng: ${(data.byteLength / 1024 / 1024).toFixed(2)} MB)`);
    return { blob, url, size: data.byteLength, duration: trimDuration };
  } catch (err) {
    console.error('FFmpeg trim error:', err);
    if (err && (String(err).includes('memory') || String(err).includes('out of bounds') || String(err).includes('abort'))) {
      ffmpegInstance = null;
    }
    throw err;
  }
};

