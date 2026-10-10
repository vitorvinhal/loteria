"use client";

export function Avatar11({ size = 32, className = "" }: { size?: number; className?: string }) {
  const gid = `a11-${size}`;
  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="11"
    >
      <defs>
        <radialGradient id={`${gid}-bg`} cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="55%" stopColor="#0f0c29" />
          <stop offset="100%" stopColor="#05040f" />
        </radialGradient>
        <linearGradient id={`${gid}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={`${gid}-num`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="55%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="60" fill={`url(#${gid}-bg)`} />
      <circle cx="64" cy="64" r="60" fill="none" stroke={`url(#${gid}-ring)`} strokeWidth="4" />
      <circle cx="64" cy="64" r="48" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.35" />
      <text
        x="64"
        y="82"
        textAnchor="middle"
        fontFamily="'Segoe UI', system-ui, -apple-system, sans-serif"
        fontSize="52"
        fontWeight="800"
        fill={`url(#${gid}-num)`}
        letterSpacing="2"
      >
        11
      </text>
      <circle cx="98" cy="34" r="3" fill="#22d3ee" opacity="0.9" />
      <circle cx="28" cy="30" r="2" fill="#a855f7" opacity="0.7" />
    </svg>
  );
}
