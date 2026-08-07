function Sombra() {
  return <ellipse cx="60" cy="107" rx="40" ry="6" fill="#000000" opacity="0.25" />;
}

/* ============================== LIVRO ============================== */
export function BookIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-testid="icon-book">
      <defs>
        <linearGradient id="ic-book-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <filter id="ic-book-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>
      <Sombra />
      <ellipse data-part="glow" cx="60" cy="62" rx="34" ry="26" fill="#FDE68A" opacity="0" />
      <g>
        <path d="M58 30 L102 26 L102 96 L58 100 Z" fill="#FEF3C7" />
        <path d="M58 30 L102 26 L102 33 L58 37 Z" fill="#FFFBEB" />
        <rect
          data-part="line-1"
          x="62"
          y="46"
          width="30"
          height="3"
          rx="1.5"
          fill="#B45309"
          opacity="0"
        />
        <rect
          data-part="line-2"
          x="62"
          y="54"
          width="24"
          height="3"
          rx="1.5"
          fill="#B45309"
          opacity="0"
        />
        <rect
          data-part="line-3"
          x="62"
          y="62"
          width="27"
          height="3"
          rx="1.5"
          fill="#B45309"
          opacity="0"
        />
      </g>
      <path d="M55 17 L63 17 L61.5 44 L57.5 44 Z" fill="#F87171" />
      <g transform="translate(22, 30)">
        <g data-part="cover">
          <path d="M0 0 L5 0 L5 68 L0 68 Z" fill="#92400E" />
          <path
            d="M5 0 L36 0 L36 68 L5 68 Z"
            fill="url(#ic-book-cover)"
            stroke="#92400E"
            strokeOpacity="0.5"
            strokeWidth="1.5"
          />
          <path
            d="M9 5 L32 5 L32 63 L9 63 Z"
            fill="none"
            stroke="#7C2D12"
            strokeWidth="1"
            opacity="0.5"
          />
          <rect x="13" y="24" width="14" height="3" rx="1.5" fill="#7C2D12" opacity="0.8" />
          <rect x="13" y="31" width="11" height="3" rx="1.5" fill="#7C2D12" opacity="0.8" />
          <path d="M5 2 L36 1 L36 6 L6 7 Z" fill="#FFFFFF" opacity="0.2" />
        </g>
      </g>
    </svg>
  );
}
