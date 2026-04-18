export default function PolicyLayout({ title, lastUpdated, children }) {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
          <div className="mb-8 pb-6 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-600 mb-2">
              Dream Paintings — Dinesh Global Enterprises Pvt. Ltd.
            </p>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {lastUpdated && (
              <p className="text-sm text-gray-400 mt-2">Last Updated: {lastUpdated}</p>
            )}
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
