const FONT = "Arial, Helvetica, sans-serif";

function Specular({ x, y, rx, ry }: { x: number; y: number; rx: number; ry: number }) {
  return (
    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFFFFF" opacity="0.28" transform={`rotate(-20 ${x} ${y})`} />
  );
}

function Sombra() {
  return <ellipse cx="60" cy="107" rx="40" ry="6" fill="#000000" opacity="0.25" />;
}

/* ============================== GAME ============================== */
export function ControllerIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-testid="icon-controller">
      <defs>
        <linearGradient id="ic-game-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="50%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="ic-game-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#065F46" />
        </linearGradient>
        <filter id="ic-game-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>
      <Sombra />
      <g filter="url(#ic-game-shadow)">
        <path
          d="M26 40 C26 24 43 19 60 19 C77 19 94 24 94 40 L94 60 C94 84 81 96 60 96 C39 96 26 84 26 60 Z"
          fill="url(#ic-game-body)"
          stroke="#065F46"
          strokeOpacity="0.5"
          strokeWidth="2"
        />
        <path d="M26 60 C26 80 33 90 44 94 L43 88 C34 84 29 76 29 60 Z" fill="#064E3B" opacity="0.35" />
        <path d="M94 60 C94 80 87 90 76 94 L77 88 C86 84 91 76 91 60 Z" fill="#064E3B" opacity="0.35" />
      </g>
      <Specular x={36} y={30} rx={18} ry={8} />
      <g>
        <rect x="33" y="42" width="8" height="24" rx="3" fill="url(#ic-game-dark)" />
        <rect x="29" y="49" width="16" height="8" rx="3" fill="url(#ic-game-dark)" />
      </g>
      <circle data-part="button-1" cx="74" cy="38" r="7" fill="#F87171" />
      <circle data-part="button-2" cx="88" cy="54" r="7" fill="#60A5FA" />
      <circle data-part="button-3" cx="74" cy="70" r="7" fill="#34D399" />
      <circle data-part="button-4" cx="60" cy="54" r="7" fill="#FBBF24" />
      <text x="74" y="41.5" textAnchor="middle" fontFamily={FONT} fontSize="7" fontWeight="800" fill="#fff">Y</text>
      <text x="88" y="57.5" textAnchor="middle" fontFamily={FONT} fontSize="7" fontWeight="800" fill="#fff">B</text>
      <text x="74" y="73.5" textAnchor="middle" fontFamily={FONT} fontSize="7" fontWeight="800" fill="#fff">A</text>
      <text x="60" y="57.5" textAnchor="middle" fontFamily={FONT} fontSize="7" fontWeight="800" fill="#3F2400">X</text>
      <g data-part="analog">
        <circle cx="46" cy="78" r="8" fill="url(#ic-game-dark)" />
        <circle cx="46" cy="78" r="5" fill="none" stroke="#A7F3D0" strokeWidth="1.5" opacity="0.8" />
        <path d="M46 71 V74 M46 82 V85 M39 78 H42 M50 78 H53" stroke="#A7F3D0" strokeWidth="1.2" opacity="0.8" />
      </g>
    </svg>
  );
}
