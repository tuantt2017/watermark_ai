import React from 'react';

const iconProps = (size = 20, color = 'currentColor', className = '') => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className
});

export const Wand2 = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
    <path d="m14 7 3 3" />
    <path d="M5 6v4" />
    <path d="M19 14v4" />
    <path d="M10 2v2" />
    <path d="M7 8H3" />
    <path d="M21 16h-4" />
    <path d="M11 3H9" />
  </svg>
);

export const Image = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

export const Video = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="m22 8-6 4 6 4V8Z" />
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
  </svg>
);

export const Sparkles = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

export const Key = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="m21 2-2 2m-1.5 1.5L19 7l-2 2-2-2-2 2-2-2" />
    <circle cx="7.5" cy="15.5" r="5.5" />
  </svg>
);

export const Upload = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

export const RefreshCw = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

export const Download = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

export const RotateCcw = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const Sliders = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <line x1="4" x2="4" y1="21" y2="14" />
    <line x1="4" x2="4" y1="10" y2="3" />
    <line x1="12" x2="12" y1="21" y2="12" />
    <line x1="12" x2="12" y1="8" y2="3" />
    <line x1="20" x2="20" y1="21" y2="16" />
    <line x1="20" x2="20" y1="12" y2="3" />
    <line x1="1" x2="7" y1="14" y2="14" />
    <line x1="9" x2="15" y1="8" y2="8" />
    <line x1="17" x2="23" y1="16" y2="16" />
  </svg>
);

export const Eye = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const Check = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const AlertCircle = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

export const Scan = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
  </svg>
);

export const Square = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
  </svg>
);

export const Brush = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-1.66 0-3 1.34-3 3 0 2 2 3 3 3s3-1 3-3c0-1.66-1.34-3-3-3Z" />
  </svg>
);

export const Eraser = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
    <path d="M22 21H7" />
    <path d="m5 11 9 9" />
  </svg>
);

export const Play = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const Pause = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <rect width="4" height="16" x="6" y="4" />
    <rect width="4" height="16" x="14" y="4" />
  </svg>
);

export const Layers = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export const ShieldCheck = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const Cpu = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <rect width="16" height="16" x="4" y="4" rx="2" />
    <rect width="6" height="6" x="9" y="9" rx="1" />
    <path d="M15 2v2" />
    <path d="M15 20v2" />
    <path d="M2 15h2" />
    <path d="M2 9h2" />
    <path d="M20 15h2" />
    <path d="M20 9h2" />
    <path d="M9 2v2" />
    <path d="M9 20v2" />
  </svg>
);

export const ExternalLink = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);

export const X = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const Scissors = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

export const Clock = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg {...iconProps(size, color, className)}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

