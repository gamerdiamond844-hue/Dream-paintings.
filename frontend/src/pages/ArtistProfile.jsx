import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import PaintingCard from '../components/PaintingCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ArtistProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [paintings, setPaintings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/paintings/artist/${id}`),
    ]).then(([p]) => {
      setPaintings(p.data.filter(x => x.status === 'approved'));
      if (p.data.length > 0) {
        setArtist({ name: p.data[0].artist_name, avatar: p.data[0].artist_avatar });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-16"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="content-layer min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Artist header */}
        <div className="flex items-center gap-6 mb-12">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center flex-shrink-0 glow-red">
            {artist?.avatar
              ? <img src={artist.avatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-white text-3xl font-bold">{artist?.name?.[0]}</span>
            }
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div>
                <h1 className="font-display text-4xl font-bold text-gray-900">{artist?.name || 'Artist'}</h1>
                <p className="text-gray-500 mt-1">{paintings.length} artworks</p>
              </div>
              <button
                onClick={() => {
                  if (!user) return navigate('/login');
                  navigate(`/chat?user=${id}`);
                }}
                className="btn-primary rounded-full px-5 py-3 text-sm font-semibold"
              >
                Contact Artist
              </button>
            </div>
          </div>
        </div>

        {paintings.length === 0 ? (
          <p className="text-gray-400 text-center py-20">No approved paintings yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paintings.map(p => <PaintingCard key={p.id} painting={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
