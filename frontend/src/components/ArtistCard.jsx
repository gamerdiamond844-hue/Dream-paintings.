import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Star } from 'lucide-react';

const ArtistCard = ({ artist }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="group relative bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl p-8 hover:shadow-2xl hover:shadow-red-100/50 hover:-translate-y-4 transition-all duration-500 overflow-hidden glass"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-500/5 group-hover:from-red-500/10" />
      <div className="relative z-10">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl overflow-hidden ring-4 ring-white/50 group-hover:ring-red-200/50 transition-all">
          <img 
            src={artist.avatar || '/api/placeholder/96/96'} 
            alt={artist.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center font-display group-hover:text-red-600 transition-colors">
          {artist.name}
        </h3>
        <p className="text-gray-500 text-center mb-6">{artist.paintings} Paintings</p>
        <div className="flex items-center justify-center gap-1 mb-6 text-sm text-yellow-400">
          <Star fill="currentColor" size={16} />
          <span>{artist.rating?.toFixed(1) || 'New'}</span>
        </div>
        <Link 
          to={`/artist/${artist.id}`}
          className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-4 px-6 rounded-2xl font-semibold text-center group-hover:shadow-2xl group-hover:shadow-red-500/25 transition-all flex items-center justify-center gap-2 hover:from-red-600 hover:to-rose-700"
        >
          View Profile <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
};

export default ArtistCard;

