function Sombra() {
  return <ellipse cx="60" cy="107" rx="40" ry="6" fill="#000000" opacity="0.25" />;
}

/* ============================== HQ & MANGÁ ============================== */
export function MagazineIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-part="icon" data-testid="icon-magazine">
      <defs>
        <linearGradient id="ic-hq-page" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="ic-hq-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <filter id="ic-hq-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>
      <Sombra />
      <g filter="url(#ic-hq-shadow)">
        <rect
          x="14"
          y="12"
          width="92"
          height="92"
          rx="8"
          fill="url(#ic-hq-page)"
          stroke="#7C3AED"
          strokeOpacity="0.5"
          strokeWidth="2"
        />
      </g>
      <rect x="20" y="18" width="36" height="28" rx="4" fill="url(#ic-hq-dark)" />
      <rect
        x="60"
        y="18"
        width="36"
        height="28"
        rx="4"
        fill="#FDF2F8"
        stroke="#7C3AED"
        strokeWidth="1.5"
      />
      <rect
        x="20"
        y="50"
        width="36"
        height="44"
        rx="4"
        fill="#FDF2F8"
        stroke="#7C3AED"
        strokeWidth="1.5"
      />
      <rect x="60" y="50" width="36" height="44" rx="4" fill="url(#ic-hq-dark)" />
      <g fill="#A78BFA" opacity="0.5">
        <circle cx="66" cy="23" r="1.3" />
        <circle cx="73" cy="23" r="1.3" />
        <circle cx="80" cy="23" r="1.3" />
        <circle cx="66" cy="29" r="1.3" />
        <circle cx="73" cy="29" r="1.3" />
      </g>
      <circle data-part="dot-1" cx="44" cy="46" r="3.5" fill="#F472B6" />
      <circle data-part="dot-2" cx="70" cy="47" r="3" fill="#A78BFA" />
      <circle data-part="dot-3" cx="88" cy="50" r="3" fill="#F472B6" />
      <circle data-part="dot-4" cx="52" cy="94" r="3" fill="#A78BFA" />
      <circle data-part="dot-5" cx="34" cy="52" r="2.5" fill="#FBBF24" />
      <circle data-part="dot-6" cx="86" cy="94" r="3.5" fill="#F472B6" />
      <path
        d="M74 64 C74 57 88 57 88 64 C88 69 84 71 80 71.5 L82 76 L76 71 C72 70 74 64 74 64 Z"
        fill="#FFFFFF"
        stroke="#7C3AED"
        strokeWidth="2"
      />
      <circle cx="81" cy="67" r="3" fill="#7C3AED" />
    </svg>
  );
}
