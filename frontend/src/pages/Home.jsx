import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp, Users, Star, Award, Palette, ShoppingBag } from 'lucide-react';
import Hero3D from '../components/Hero3D';
import PaintingCard from '../components/PaintingCard';
import ArtistCard from '../components/ArtistCard';
import TestimonialCard from '../components/TestimonialCard';
import CategoryGrid from '../components/CategoryGrid';
import api from '../utils/api';

const SkeletonGrid = ({ count, h = 'h-96' }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`skeleton ${h} rounded-3xl`} />
    ))}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="col-span-full text-center py-20 text-gray-400">
    <Palette size={48} className="mx-auto mb-4 opacity-30" />
    <p className="text-lg">{message}</p>
  </div>
);

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/homepage').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const cfg = data?.config || {};
  const stats = data?.stats || {};

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Hero */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <Hero3D interactive />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="text-center text-white max-w-4xl mx-auto px-6 z-20 relative"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full px-6 py-3 mb-12"
          >
            <Sparkles size={20} />
            <span className="uppercase tracking-wider font-medium text-sm">Premium Art Marketplace</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="font-display text-6xl md:text-7xl lg:text-9xl font-black leading-none mb-8 bg-gradient-to-r from-white via-red-100 to-white bg-clip-text text-transparent drop-shadow-2xl"
          >
            Dream<span className="block bg-gradient-to-r from-red-400 via-red-500 to-rose-600 bg-clip-text text-transparent">Paintings</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Discover extraordinary original paintings from the world's most talented artists.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            <Link to="/gallery" className="glass bg-white/90 text-gray-900 px-10 py-6 rounded-3xl font-bold text-lg backdrop-blur-xl border border-white/50 shadow-2xl hover:-translate-y-2 transition-all duration-300 flex items-center gap-3 mx-auto sm:mx-0 w-full sm:w-auto justify-center">
              Explore Gallery <ArrowRight size={24} />
            </Link>
            <Link to="/register?role=artist" className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-10 py-6 rounded-3xl font-bold text-lg shadow-2xl hover:-translate-y-2 transition-all duration-300 flex items-center gap-3 mx-auto sm:mx-0 w-full sm:w-auto justify-center">
              Become Artist <ArrowRight size={24} />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Live Stats */}
      {!loading && stats.totalPaintings > 0 && (
        <section className="py-16 bg-gradient-to-r from-red-600 to-rose-700">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-white text-center">
            {[
              { icon: Palette, label: 'Paintings', value: stats.totalPaintings },
              { icon: Users, label: 'Artists', value: stats.totalArtists },
              { icon: ShoppingBag, label: 'Sales', value: stats.totalSales },
              { icon: Users, label: 'Members', value: stats.totalUsers },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <Icon size={28} className="mx-auto mb-2 opacity-80" />
                <p className="text-3xl font-black font-display">{value?.toLocaleString('en-IN')}</p>
                <p className="text-red-200 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Paintings */}
      {(loading || cfg.section_featured !== false) && (
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="py-32 bg-gradient-to-b from-white to-red-50/30"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp size={24} className="text-red-600 shrink-0" />
              <span className="uppercase tracking-wider text-sm font-bold text-red-600">Featured Collection</span>
            </div>
            <h2 className="font-display text-5xl lg:text-6xl font-black text-gray-900 mb-20">
              {cfg.featured_title || 'Curated Masterpieces'}
            </h2>
            {loading ? (
              <SkeletonGrid count={6} />
            ) : data?.featured?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {data.featured.map(p => <PaintingCard key={p.id} painting={p} />)}
              </div>
            ) : (
              <EmptyState message="No featured paintings yet. Admin can feature paintings from the dashboard." />
            )}
            <div className="text-center mt-24">
              <Link to="/gallery" className="glass bg-white border border-red-200/50 text-red-600 px-12 py-6 rounded-3xl font-bold text-xl hover:shadow-xl transition-all">
                View All Gallery
              </Link>
            </div>
          </div>
        </motion.section>
      )}

      {/* Master Artists */}
      {(loading || cfg.section_artists !== false) && (
        <section className="py-32 bg-white relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-64 bg-gradient-to-b from-red-500/5 to-rose-500/5 -skew-x-12" />
          <div className="relative max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <Users size={24} className="text-red-600" />
              <span className="uppercase tracking-wider text-sm font-bold text-red-600">Top Creators</span>
            </div>
            <h2 className="font-display text-5xl lg:text-6xl font-black text-gray-900 mb-20">
              {cfg.artists_title || 'Master Artists'}
            </h2>
            {loading ? (
              <div className="flex gap-8 overflow-x-auto pb-8">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton w-80 h-64 rounded-3xl flex-shrink-0" />)}
              </div>
            ) : data?.artists?.length ? (
              <div className="flex gap-8 overflow-x-auto pb-8 -mx-6 px-6 scrollbar-thin scrollbar-thumb-red-200 snap-x snap-mandatory">
                {data.artists.map(artist => (
                  <div key={artist.id} className="flex-shrink-0 w-80 snap-center">
                    <ArtistCard artist={{ ...artist, paintings: artist.painting_count }} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No master artists selected yet. Admin can select master artists from the dashboard." />
            )}
          </div>
        </section>
      )}

      {/* Trending */}
      {(loading || cfg.section_trending !== false) && (
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="py-32 bg-gradient-to-t from-red-50 to-white"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <Award size={24} className="text-red-600" />
              <span className="uppercase tracking-wider text-sm font-bold text-red-600">What's Hot</span>
            </div>
            <h2 className="font-display text-5xl lg:text-6xl font-black text-gray-900 mb-20">
              {cfg.trending_title || 'Trending Now'}
            </h2>
            {loading ? (
              <SkeletonGrid count={8} h="h-72" />
            ) : data?.trending?.length ? (
              <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
                {data.trending.map(p => <PaintingCard key={p.id} painting={p} className="break-inside-avoid mb-8" />)}
              </div>
            ) : (
              <EmptyState message="No trending paintings yet." />
            )}
          </div>
        </motion.section>
      )}

      {/* Recent Launch */}
      {(loading || cfg.section_recent !== false) && (
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="py-32 bg-white"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles size={24} className="text-red-600" />
              <span className="uppercase tracking-wider text-sm font-bold text-red-600">Just Added</span>
            </div>
            <h2 className="font-display text-5xl lg:text-6xl font-black text-gray-900 mb-20">
              {cfg.recent_title || 'Recent Launch'}
            </h2>
            {loading ? (
              <SkeletonGrid count={6} />
            ) : data?.recent?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {data.recent.map(p => <PaintingCard key={p.id} painting={p} />)}
              </div>
            ) : (
              <EmptyState message="No paintings yet." />
            )}
          </div>
        </motion.section>
      )}

      {/* Categories */}
      <section className="py-32 bg-white/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-5xl lg:text-6xl font-black text-gray-900 text-center mb-24"
          >
            Explore by Style
          </motion.h2>
          <CategoryGrid />
        </div>
      </section>

      {/* Testimonials */}
      {(loading || cfg.section_testimonials !== false) && (
        <section className="py-32 bg-gradient-to-b from-red-600/5 to-rose-500/5">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-24">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-700 px-6 py-3 rounded-2xl border border-red-200/50 mx-auto mb-8">
                <Star size={20} />
                <span className="font-semibold">5-Star Rated Platform</span>
              </div>
              <h2 className="font-display text-5xl lg:text-6xl font-black text-gray-900 mb-8">
                {cfg.testimonials_title || 'What Artists Say'}
              </h2>
            </div>
            {loading ? (
              <SkeletonGrid count={3} h="h-56" />
            ) : data?.testimonials?.length ? (
              <div className="grid md:grid-cols-3 gap-8">
                {data.testimonials.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                    <TestimonialCard testimonial={t} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState message="No testimonials yet. Admin can add them from the dashboard." />
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-rose-700 to-red-800 opacity-95" />
        <div className="relative max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="font-display text-5xl md:text-6xl font-black mb-6 drop-shadow-2xl">Ready to Create?</h2>
          <p className="text-xl md:text-2xl text-red-100 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join our exclusive platform and transform your passion into a thriving art career.
          </p>
          <Link to="/register?role=artist" className="glass bg-white/20 backdrop-blur-xl text-white border border-white/40 px-12 py-8 rounded-3xl font-bold text-2xl shadow-2xl hover:bg-white/30 transition-all duration-300 inline-flex items-center gap-4">
            Start Selling <ArrowRight size={28} />
          </Link>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-gray-950/95 backdrop-blur-xl border-t border-white/10 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 text-sm">
            <div className="flex items-center gap-4 mb-8 md:mb-0">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Palette className="text-white w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold text-white mb-2 gradient-text">Dream Paintings</h3>
                <p>Luxury art marketplace</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-6">Platform</h4>
              <ul className="space-y-3">
                <li><Link to="/gallery" className="hover:text-red-400 transition-colors">Gallery</Link></li>
                <li><Link to="/login" className="hover:text-red-400 transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-6">Artists</h4>
              <ul className="space-y-3">
                <li><Link to="/register?role=artist" className="hover:text-red-400 transition-colors">Sell Art</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-6">Company</h4>
              <p className="mb-4">Premium art for modern collectors</p>
              <p className="text-xs opacity-75">© 2024 Dream Paintings. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
