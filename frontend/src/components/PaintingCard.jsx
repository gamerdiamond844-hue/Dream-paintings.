import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Eye } from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';

export default function PaintingCard({ painting, showStatus = false }) {
  return (
    <div className="painting-card bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 group cursor-pointer">
      <Link to={`/paintings/${painting.id}`}>
        <div className="relative overflow-hidden aspect-[4/3]">
          <img
            src={painting.image_url}
            alt={painting.title}
            loading="lazy"
            className="painting-img w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-3 left-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 sm:translate-y-2 sm:group-hover:translate-y-0">
            <div className="flex items-center gap-3 text-white text-xs">
              <span className="flex items-center gap-1"><Heart size={12} /> {painting.likes_count || 0}</span>
              <span className="flex items-center gap-1"><MessageCircle size={12} /> {painting.comments_count || 0}</span>
              <span className="flex items-center gap-1"><Eye size={12} /> {painting.views || 0}</span>
            </div>
          </div>
          {showStatus && (
            <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold ${
              painting.status === 'approved' ? 'bg-green-100 text-green-700' :
              painting.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {painting.status}
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display font-semibold text-gray-900 text-lg leading-tight mb-1 line-clamp-1">{painting.title}</h3>
          <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
            by {painting.artist_name}
            {painting.artist_is_verified && (
              <VerifiedBadge level={painting.artist_badge_level} size="sm" />
            )}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-red-600 font-bold text-lg">₹{parseFloat(painting.price).toLocaleString()}</span>
            {painting.category && (
              <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full">{painting.category}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
