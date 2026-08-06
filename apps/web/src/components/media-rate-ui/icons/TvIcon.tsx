const FONT = "Arial, Helvetica, sans-serif";

function Specular({ x, y, rx, ry }: { x: number; y: number; rx: number; ry: number }) {
  return (
    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFFFFF" opacity="0.28" transform={`rotate(-20 ${x} ${y})`} />
  );
}

function Sombra() {
  return <ellipse cx="60" cy="107" rx="40" ry="6" fill="#000000" opacity="0.25" />;
}

/* ============================== SÉRIE ============================== */
export function TvIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-testid="icon-tv">
      <defs>
        <linearGradient id="ic-tv-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="ic-tv-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>
        <clipPath id="ic-tv-screen">
          <rect x="26" y="34" width="54" height="40" rx="4" />
        </clipPath>
        <filter id="ic-tv-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>
      <Sombra />
      <g filter="url(#ic-tv-shadow)">
        <rect x="16" y="26" width="88" height="64" rx="10" fill="url(#ic-tv-body)" />
        <rect x="16" y="26" width="88" height="64" rx="10" fill="none" stroke="#075985" strokeOpacity="0.5" strokeWidth="1.5" />
      </g>
      <Specular x={26} y={36} rx={16} ry={7} />
      <rect x="26" y="34" width="54" height="40" rx="4" fill="#082F49" />
      <g clipPath="url(#ic-tv-screen)">
        <g data-part="screen">
          <path d="M42 48 L56 54 L42 60 Z" fill="#E0F2FE" />
          <rect x="62" y="48" width="3" height="12" rx="1.5" fill="#7DD3FC" opacity="0.8" />
        </g>
        <rect data-part="scanline" x="26" y="34" width="54" height="10" fill="#FFFFFF" opacity="0.25" />
      </g>
      <rect x="16" y="90" width="88" height="8" rx="4" fill="url(#ic-tv-dark)" />
      <path d="M40 26 L26 8 M80 26 L94 8" stroke="#7DD3FC" strokeWidth="2" strokeLinecap="round" />
      <circle cx="26" cy="8" r="2.5" fill="#7DD3FC" />
      <circle cx="94" cy="8" r="2.5" fill="#7DD3FC" />
    </svg>
  );
}
