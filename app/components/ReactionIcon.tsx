import React from 'react';

// Debate reaction icons in the platform style. Temperature-coded:
// love = cool blue (affection), disappointment = cold slate, disagreement = amber, fury = hot orange-red.
export type ReactionType = 'love' | 'sad' | 'no' | 'fury';

export function ReactionIcon({ type, size = 24 }: { type: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24' } as const;

  if (type === 'love') {
    return (
      <svg {...common} style={{ filter: 'drop-shadow(0 0 6px rgba(91,192,240,.6))' }}>
        <path d="M12 20.5C5.5 16 2.5 12 2.5 8.4 2.5 5.6 4.7 3.7 7.2 3.7c1.8 0 3.4 1 4.8 2.8 1.4-1.8 3-2.8 4.8-2.8 2.5 0 4.7 1.9 4.7 4.7 0 3.6-3 7.6-9.5 12.1z" fill="#5BC0F0" />
      </svg>
    );
  }
  if (type === 'sad') {
    return (
      <svg {...common}>
        <path d="M12 20.5C5.5 16 2.5 12 2.5 8.4 2.5 5.6 4.7 3.7 7.2 3.7c1.8 0 3.4 1 4.8 2.8 1.4-1.8 3-2.8 4.8-2.8 2.5 0 4.7 1.9 4.7 4.7 0 3.6-3 7.6-9.5 12.1z" fill="#6E7A92" />
        <path d="M12 5.5 L10 9.5 L13 12 L10.5 15.5 L12 19" fill="none" stroke="#3A4150" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'no') {
    return (
      <svg {...common}>
        <path d="M16.5 3H8.2a2.5 2.5 0 0 0-2.45 2l-1.3 6.5A2.5 2.5 0 0 0 6.9 14.5H11l-.9 3.8a2 2 0 0 0 1.95 2.45c.55 0 1.05-.3 1.3-.8L16.5 14.5z" fill="#EFA73A" />
        <rect x="17.5" y="3" width="3.8" height="11.5" rx="1.2" fill="#EFA73A" />
      </svg>
    );
  }
  // fury
  return (
    <svg {...common} style={{ filter: 'drop-shadow(0 0 6px rgba(255,90,44,.55))' }}>
      <circle cx="12" cy="12.5" r="9" fill="#FF5A2C" />
      <path d="M6.5 9.2 L10.2 10.8 M17.5 9.2 L13.8 10.8" stroke="#3A0F04" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="13" r="1.2" fill="#3A0F04" />
      <circle cx="15" cy="13" r="1.2" fill="#3A0F04" />
      <path d="M8.5 18 Q12 15.3 15.5 18" fill="none" stroke="#3A0F04" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export const REACTIONS: ReactionType[] = ['love', 'sad', 'no', 'fury'];
