import React from 'react';

// Platform-style line glyphs per category slug. Inherit color via `currentColor`.
const GLYPHS: Record<string, React.ReactNode> = {
  money: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M5.5 9.5h.01M18.5 14.5h.01" />
    </>
  ),
  love: <path d="M12 20s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.7 12 20 12 20z" />,
  parenting: (
    <>
      <circle cx="9" cy="6.5" r="2.4" />
      <path d="M9 9.2v5.8M6.5 18.5 9 15.5l2.5 3" />
      <circle cx="17" cy="10.5" r="1.8" />
      <path d="M17 12.5v3.5M15.4 18.5 17 16l1.6 2.5" />
    </>
  ),
  lifestyle: (
    <>
      <path d="M4.5 12h15" />
      <rect x="2" y="8.8" width="3" height="6.4" rx="1" />
      <rect x="19" y="8.8" width="3" height="6.4" rx="1" />
      <rect x="5.5" y="10.2" width="2.4" height="3.6" rx="0.8" />
      <rect x="16.1" y="10.2" width="2.4" height="3.6" rx="0.8" />
    </>
  ),
  digital: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2.6" />
      <path d="M10.5 18h3" />
    </>
  ),
  auto: (
    <>
      <path d="M3 14l1.4-4.4A2 2 0 0 1 6.3 8.2h11.4a2 2 0 0 1 1.9 1.4L21 14v3.2a1 1 0 0 1-1 1h-1.4a1 1 0 0 1-1-1V17H6.4v.2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <circle cx="7" cy="14.6" r="1.2" />
      <circle cx="17" cy="14.6" r="1.2" />
    </>
  ),
  culture: (
    <>
      <path d="M6 9l1.4 11h9.2L18 9z" />
      <path d="M9.5 11.5v6.5M14.5 11.5v6.5" />
      <circle cx="8.6" cy="7.6" r="1.9" />
      <circle cx="12" cy="6.6" r="2.1" />
      <circle cx="15.4" cy="7.6" r="1.9" />
    </>
  ),
  science: (
    <>
      <ellipse cx="12" cy="13" rx="8" ry="3" />
      <path d="M8 11.6a4 4 0 0 1 8 0" />
      <path d="M8.5 16.5 7 19.5M15.5 16.5 17 19.5M12 16.5V20" />
    </>
  ),
};

export function CategoryIcon({ slug, size = 26 }: { slug: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {GLYPHS[slug] || GLYPHS.culture}
    </svg>
  );
}
