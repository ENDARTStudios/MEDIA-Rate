function Specular({ x, y, rx, ry }: { x: number; y: number; rx: number; ry: number }) {
  return (
    <ellipse
      cx={x}
      cy={y}
      rx={rx}
      ry={ry}
      fill="#FFFFFF"
      opacity="0.28"
      transform={`rotate(-20 ${x} ${y})`}
    />
  );
}

function Sombra() {
  return <ellipse cx="60" cy="107" rx="40" ry="6" fill="#000000" opacity="0.25" />;
}

/* ============================== FILME ============================== */
export function ClapperboardIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-testid="icon-clapperboard">
      <defs>
        <linearGradient id="ic-film-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="50%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="ic-film-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#3730A3" />
        </linearGradient>
        <clipPath id="ic-film-stripes">
          <rect x="0" y="12" width="64" height="14" rx="2" />
        </clipPath>
        <filter id="ic-film-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>
      <Sombra />
      <g data-part="flash" opacity="0">
        <path
          d="M60 6 L66 44 L103 51 L66 58 L60 96 L54 58 L17 51 L54 44 Z"
          fill="#FFFFFF"
          opacity="0.4"
        />
      </g>
      <g filter="url(#ic-film-shadow)">
        <rect x="24" y="54" width="72" height="46" rx="9" fill="url(#ic-film-body)" />
        <rect
          x="24"
          y="54"
          width="72"
          height="46"
          rx="9"
          fill="none"
          stroke="#3730A3"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
      </g>
      <Specular x={34} y={64} rx={18} ry={8} />
      <rect x="42" y="79" width="36" height="4" rx="2" fill="#EEF2FF" opacity="0.9" />
      <g transform="translate(28, 50)">
        <g data-part="mouth">
          <rect x="0" y="0" width="64" height="12" rx="4" fill="url(#ic-film-dark)" />
          <rect x="0" y="12" width="64" height="14" fill="#312E81" />
          <g clipPath="url(#ic-film-stripes)">
            <path
              d="M-4 28 L10 3 H26 L12 28 Z M20 28 L34 3 H50 L36 28 Z M44 28 L58 3 H74 L60 28 Z"
              fill="#E0E7FF"
            />
          </g>
          <rect x="0" y="12" width="64" height="2" fill="#FFFFFF" opacity="0.2" />
        </g>
      </g>
    </svg>
  );
}
