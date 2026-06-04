const SIZES = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-12 h-12 text-base',
  lg: 'w-20 h-20 text-3xl',
};

function initials(name) {
  if (!name) return '';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/**
 * Display-only member avatar: shows the photo if present, otherwise the
 * member's initials (or a 👤 fallback) on a tinted circle.
 */
export default function Avatar({ src, name, size = 'md', className = '' }) {
  const ini = initials(name);
  return (
    <div
      className={`${SIZES[size] || SIZES.md} rounded-full bg-primary-100 text-primary-700 overflow-hidden flex items-center justify-center font-semibold shrink-0 ${className}`}
      title={name || ''}
    >
      {src
        ? <img src={src} alt={name || ''} className="w-full h-full object-cover" />
        : (ini || '👤')}
    </div>
  );
}
