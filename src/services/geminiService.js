/**
 * Google Gemini API Client-Side Integration
 * Enhanced for Gemini 3 Pro, Gemini 3.8, and Image Models
 * Supports:
 * 1. Dynamic Model Discovery (List models available to this specific API Key)
 * 2. AI Watermark Auto-Detection (Bounding Box coordinates via gemini-3.8-flash / gemini-3.8-pro)
 * 3. AI Inpainting / Watermark Removal (gemini-3-pro-image-preview, gemini-3.1-flash-image, Interactions API)
 */

const STORAGE_KEY = 'gemini_api_key';

export const getStoredApiKey = () => {
  return localStorage.getItem(STORAGE_KEY) || '';
};

export const setStoredApiKey = (key) => {
  if (key) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

/**
 * Convert Canvas or Image to clean base64 data (without data:image/... prefix)
 */
export const canvasToBase64 = (canvas, type = 'image/jpeg', quality = 0.9) => {
  const dataUrl = canvas.toDataURL(type, quality);
  return dataUrl.split(',')[1];
};

/**
 * Query all models accessible by this API Key
 */
export const listAvailableModels = async (apiKey = getStoredApiKey()) => {
  if (!apiKey) return [];
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.models || [];
  } catch (e) {
    console.warn('Failed to fetch available models:', e);
    return [];
  }
};

/**
 * Call Gemini 3.8 Flash / Pro to automatically detect watermark bounding boxes
 */
export const detectWatermarksWithGemini = async (canvas, apiKey = getStoredApiKey()) => {
  if (!apiKey) {
    throw new Error('Chưa cấu hình Gemini API Key. Vui lòng nhập API Key trong phần Cài đặt.');
  }

  const base64Data = canvasToBase64(canvas, 'image/jpeg', 0.85);

  const prompt = `Inspect this image carefully. Find all watermarks, logos, website URLs, timestamps, transparent stamps, or overlaid promotional text.
Return ONLY a valid JSON array of bounding boxes with normalized coordinates from 0 to 1000.
Format strictly as:
[
  {"box_2d": [ymin, xmin, ymax, xmax], "label": "watermark description"}
]
If there are no watermarks or text overlays, return []. Do not include markdown formatting or backticks outside the JSON.`;

  const endpoints = [
    `https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-pro:generateContent?key=${apiKey}`
  ];

  let lastErr = '';

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textOutput) return [];

        try {
          const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
          console.warn('Failed to parse Gemini bounding boxes:', textOutput);
          return [];
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        lastErr = errData.error?.message || `HTTP ${response.status}`;
      }
    } catch (e) {
      lastErr = e.message;
    }
  }

  throw new Error(lastErr || 'Lỗi phân tích hình ảnh bằng Gemini.');
};

/**
 * Call Gemini Pro / Flash Image Generation & Inpainting Models
 */
export const removeWatermarkWithGemini = async (
  sourceCanvas,
  maskCanvas,
  apiKey = getStoredApiKey()
) => {
  if (!apiKey) {
    throw new Error('Chưa cấu hình Gemini API Key. Vui lòng nhập API Key trong phần Cài đặt.');
  }

  const imageBase64 = canvasToBase64(sourceCanvas, 'image/png');
  const maskBase64 = maskCanvas ? canvasToBase64(maskCanvas, 'image/png') : null;

  const prompt = `Remove all watermarks, logos, stamps, timestamps, and superimposed text overlaid on this image.
CRITICAL INSTRUCTION: Completely eliminate all ghosting shadows, faint silhouettes, semi-transparent text halos, and blurry smudges.
Seamlessly reconstruct and inpaint the background matching the surrounding authentic textures, lighting, patterns, and natural noise grain.
Ensure the repaired area is 100% sharp and invisible. Keep all real subjects, faces, background details, colors, and resolution faithful to the original image.`;

  // Prepare parts: prompt + original image + mask image
  const parts = [
    { text: prompt },
    {
      inline_data: {
        mime_type: 'image/png',
        data: imageBase64
      }
    }
  ];

  if (maskBase64) {
    parts.push({
      inline_data: {
        mime_type: 'image/png',
        data: maskBase64
      }
    });
  }

  // List of models and endpoints to try in priority order:
  // 1. Pro Image Preview (gemini-3-pro-image-preview on v1beta)
  // 2. Flash Image (gemini-3.1-flash-image on v1 & v1beta)
  // 3. Interactions API
  const endpointsToTry = [
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent',
    'https://generativelanguage.googleapis.com/v1/models/gemini-3-pro-image-preview:generateContent',
    'https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent'
  ];

  let lastErrorMsg = '';

  for (const endpoint of endpointsToTry) {
    try {
      const resp = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }]
        })
      });

      if (resp.ok) {
        const resJson = await resp.json();
        const candidate = resJson.candidates?.[0];
        const resParts = candidate?.content?.parts || [];

        for (const p of resParts) {
          const inline = p.inline_data || p.inlineData;
          if (inline && inline.data) {
            const mime = inline.mime_type || inline.mimeType || 'image/png';
            return `data:${mime};base64,${inline.data}`;
          }
        }
      } else {
        const errJson = await resp.json().catch(() => ({}));
        lastErrorMsg = errJson.error?.message || `HTTP ${resp.status}`;
        console.warn(`Endpoint ${endpoint} failed:`, lastErrorMsg);
      }
    } catch (e) {
      lastErrorMsg = e.message;
    }
  }

  // Try the Interactions API with both Pro and Flash models
  const interactionModels = ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image'];
  const interactionUrl = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

  for (const m of interactionModels) {
    try {
      const resp = await fetch(interactionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: m,
          input: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              data: imageBase64,
              mime_type: 'image/png'
            }
          ]
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.output_image?.data) {
          return `data:${data.output_image.mime_type || 'image/png'};base64,${data.output_image.data}`;
        }
      } else {
        const errJson = await resp.json().catch(() => ({}));
        if (errJson.error?.message) {
          lastErrorMsg = errJson.error.message;
        }
      }
    } catch (e) {
      lastErrorMsg = e.message;
    }
  }

  const isFreeTierLimitation = /limit:\s*0|Free Tier|rate-limit|RESOURCE_EXHAUSTED/i.test(lastErrorMsg);
  const errorObj = new Error(
    lastErrorMsg ||
      'Không thể xóa watermark bằng Gemini AI. Hãy thử chế độ Xóa Nhanh (OpenCV.js) hoặc kiểm tra quyền model của API Key.'
  );
  errorObj.isFreeTierLimitation = isFreeTierLimitation;
  throw errorObj;
};
