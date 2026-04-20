import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import api from '../utils/api';
import PaintingCard from '../components/PaintingCard';
import LoadingSpinner from '../components/LoadingSpinner';

const CATEGORIES = ['Abstract', 'Landscape', 'Portrait', 'Still Life', 'Modern', 'Traditional', 'Watercolor', 'Oil', 'Digital'];

export default function Gallery() {
  const [paintings, setPaintings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 12;

  const fetchPaintings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const res = await api.get(`/paintings?${params}`);
      setPaintings(res.data.paintings);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  }, [search, category, page]);

  useEffect(() => { fetchPaintings(); }, [fetchPaintings]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchPaintings(); };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="content-layer min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-gray-900 mb-2">Gallery</h1>
          <p className="text-gray-500">{total} original artworks available</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, artist, category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-full text-sm focus:border-red-400 transition-all bg-white shadow-sm"
            />
            {search && (
              <button type="button" onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600">
                <X size={16} />
              </button>
            )}
          </form>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-3 rounded-full border text-sm font-medium transition-all ${showFilters ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-700 hover:border-red-300'}`}>
            <SlidersHorizontal size={16} /> Filters
          </button>
        </div>

        {/* Category filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-8 p-4 bg-gray-50 rounded-2xl">
            <button onClick={() => { setCategory(''); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!category ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-red-50 border border-gray-200'}`}>
              All
            </button>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => { setCategory(c); setPage(1); }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${category === c ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-red-50 border border-gray-200'}`}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : paintings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No paintings found</p>
            <button onClick={() => { setSearch(''); setCategory(''); setPage(1); }}
              className="mt-4 text-red-600 text-sm hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {paintings.map(p => <PaintingCard key={p.id} painting={p} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-12">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-full border border-gray-200 text-sm disabled:opacity-40 hover:border-red-300 transition-all">
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${page === p ? 'bg-red-600 text-white' : 'border border-gray-200 hover:border-red-300'}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 rounded-full border border-gray-200 text-sm disabled:opacity-40 hover:border-red-300 transition-all">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
