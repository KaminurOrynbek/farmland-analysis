import React from 'react';

export default function AgroVisionLogo({ size = 38, showText = false }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #22c55e 0%, #3b82f6 55%, #0f172a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 14px 30px rgba(59,130,246,0.32)',
          overflow: 'hidden'
        }}
      >
        <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 32 32" fill="none">
          <path d="M6 23C11 18 17 16 26 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M7 27C12 22 18 20 27 19" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.72" />
          <path d="M8 11C12 6 20 5 25 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
          <circle cx="24" cy="9" r="2.3" fill="white" />
          <circle cx="11" cy="15" r="2" fill="#bbf7d0" />
        </svg>
      </div>

      {showText && (
        <span style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          AgroVision
        </span>
      )}
    </div>
  );
}
