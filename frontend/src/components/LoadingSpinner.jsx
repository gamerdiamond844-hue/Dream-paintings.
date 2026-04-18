export default function LoadingSpinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
  return (
    <div className="flex items-center justify-center">
      <div className={`${s} border-2 border-red-200 border-t-red-600 rounded-full animate-spin`} />
    </div>
  );
}
