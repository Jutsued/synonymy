import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function BoltIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2c1 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9z" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

/** Opposite: two arrows pointing away from each other. */
export function OppositeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 7 3 12l4 5M17 7l4 5-4 5M3 12h18" />
    </svg>
  );
}

/** Related: a chain link. */
export function LinkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  );
}

/** Bomb: an explosion burst. (A round bomb with a fuse looks like the ♂ symbol at small sizes.) */
export function BombIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12.0 2.0 L13.8 7.8 L19.1 4.9 L16.2 10.2 L22.0 12.0 L16.2 13.8 L19.1 19.1 L13.8 16.2 L12.0 22.0 L10.2 16.2 L4.9 19.1 L7.8 13.8 L2.0 12.0 L7.8 10.2 L4.9 4.9 L10.2 7.8Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

export function HelpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
    </svg>
  );
}

/** The Kinword mark: two overlapping rings = two words that mean the same thing. */
export function LogoMark(props: IconProps) {
  return (
    <svg width={28} height={28} viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="16" r="8" stroke="currentColor" strokeWidth="2" opacity="0.55" />
      <circle cx="20" cy="16" r="8" stroke="#34d399" strokeWidth="2" />
      <path d="M16 9.1a8 8 0 0 1 0 13.8 8 8 0 0 1 0-13.8z" fill="#34d399" opacity="0.25" />
    </svg>
  );
}

/** The little icon that tells you what kind of word something was. */
export function CategoryIcon({ category, ...props }: IconProps & { category: 'synonym' | 'antonym' | 'contextual' | 'chaos' }) {
  switch (category) {
    case 'synonym':
      return <CheckIcon {...props} />;
    case 'antonym':
      return <OppositeIcon {...props} />;
    case 'contextual':
      return <LinkIcon {...props} />;
    case 'chaos':
      return <BombIcon {...props} />;
  }
}
