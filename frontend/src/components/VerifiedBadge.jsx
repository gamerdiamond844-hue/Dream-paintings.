// VerifiedBadge — drop-in badge for any context
// Props:
//   level   : 'red' | 'blue' | null/undefined  (null = not verified, renders nothing)
//   size    : 'sm' | 'md' | 'lg'  (default 'md')
//   tooltip : boolean (default true)

const CONFIGS = {
  red: {
    gradient: 'from-red-500 to-rose-600',
    glow: 'shadow-red-400/60',
    ring: 'ring-red-400',
    label: 'Red Verified — Premium Artist',
    price: '₹299',
  },
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-400/60',
    ring: 'ring-blue-400',
    label: 'Blue Verified — Trusted Seller',
    price: '₹99',
  },
};

const SIZES = {
  sm: { wrap: 'w-4 h-4',   tick: 8,  ring: 'ring-1' },
  md: { wrap: 'w-5 h-5',   tick: 10, ring: 'ring-2' },
  lg: { wrap: 'w-7 h-7',   tick: 14, ring: 'ring-2' },
};

export default function VerifiedBadge({ level, size = 'md', tooltip = true }) {
  if (!level || !CONFIGS[level]) return null;

  const cfg  = CONFIGS[level];
  const sz   = SIZES[size] || SIZES.md;

  const badge = (
    <span
      className={`
        inline-flex items-center justify-center flex-shrink-0
        ${sz.wrap} rounded-full
        bg-gradient-to-br ${cfg.gradient}
        shadow-md ${cfg.glow}
        ${sz.ring} ring-white
        animate-[badgePulse_3s_ease-in-out_infinite]
      `}
      aria-label={cfg.label}
    >
      {/* Checkmark SVG */}
      <svg
        viewBox="0 0 12 12"
        fill="none"
        width={sz.tick}
        height={sz.tick}
        className="text-white"
      >
        <path
          d="M2 6l3 3 5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );

  if (!tooltip) return badge;

  return (
    <span className="relative inline-flex group">
      {badge}
      {/* Tooltip */}
      <span className="
        pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
        whitespace-nowrap text-xs font-semibold text-white
        bg-gray-900/95 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow-xl
        opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50
      ">
        {cfg.label}
        <span className="block text-gray-400 font-normal text-[10px] mt-0.5 text-center">
          Verified on Dream Paintings
        </span>
        {/* Arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95" />
      </span>
    </span>
  );
}
