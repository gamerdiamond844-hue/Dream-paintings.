import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Eye, ShoppingBag, ArrowLeft, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function PaintingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [painting, setPainting] = useState(null);
  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/paintings/${id}`),
      api.get(`/paintings/${id}/comments`),
    ]).then(([p, c]) => {
      setPainting(p.data);
      setLikesCount(parseInt(p.data.likes_count) || 0);
      setLiked(p.data.user_liked || false);
      setComments(c.data);
    }).catch(() => toast.error('Failed to load painting'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    if (!user) return toast.error('Please login to like');
    try {
      const res = await api.post(`/paintings/${id}/like`);
      setLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
    } catch {
      toast.error('Failed to update like');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to comment');
    if (!commentText.trim()) return;
    try {
      const res = await api.post(`/paintings/${id}/comments`, { text: commentText });
      setComments(prev => [res.data, ...prev]);
      setCommentText('');
      toast.success('Comment posted!');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/paintings/${id}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const handlePurchase = () => {
    if (!user) return toast.error('Please login to purchase');
    navigate('/buy', { state: { painting } });
  };

  const handleMessageSeller = () => {
    if (!user) return toast.error('Please login to message the artist');
    navigate(`/chat?user=${painting.artist_id}&painting=${painting.id}`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-16">
      <LoadingSpinner size="lg" />
    </div>
  );

  if (!painting) return (
    <div className="min-h-screen flex items-center justify-center pt-16">
      <p className="text-gray-500">Painting not found</p>
    </div>
  );

  return (
    <div className="content-layer min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/gallery" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors mb-8 text-sm">
          <ArrowLeft size={16} /> Back to Gallery
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-red-100 glow-red">
              <img src={painting.image_url} alt={painting.title} className="w-full object-cover" />
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            {painting.category && (
              <span className="inline-block bg-red-50 text-red-600 text-xs font-semibold px-3 py-1 rounded-full mb-4 w-fit">
                {painting.category}
              </span>
            )}
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">{painting.title}</h1>

            {/* Artist */}
            <Link to={`/artist/${painting.artist_id}`} className="flex items-center gap-3 mb-6 group w-fit">
              {painting.artist_avatar
                ? <img src={painting.artist_avatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-red-200" />
                : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white font-bold">
                    {painting.artist_name?.[0]}
                  </div>
              }
              <div>
                <p className="text-sm text-gray-500">Artist</p>
                <p className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">{painting.artist_name}</p>
              </div>
            </Link>

            {painting.description && (
              <p className="text-gray-600 leading-relaxed mb-8">{painting.description}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 mb-8 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Eye size={15} /> {painting.views || 0} views</span>
              <span className="flex items-center gap-1.5"><Heart size={15} /> {likesCount} likes</span>
              <span className="flex items-center gap-1.5"><MessageCircle size={15} /> {comments.length} comments</span>
            </div>

            {/* Price */}
            <div className="mb-8">
              <span className="font-display text-4xl font-bold gradient-text">
                ₹{parseFloat(painting.price).toLocaleString()}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePurchase}
                className="btn-primary flex-1 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 text-base"
              >
                <ShoppingBag size={18} /> Buy Now
              </button>
              <button
                onClick={handleMessageSeller}
                className="btn-outline flex-1 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 text-base"
              >
                <MessageCircle size={18} /> Message Seller
              </button>
              <button
                onClick={handleLike}
                className={`p-4 rounded-2xl border-2 transition-all ${liked ? 'bg-red-600 border-red-600 text-white glow-red' : 'border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-500'}`}
              >
                <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>

            {!user && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                <Link to="/login" className="text-red-500 hover:underline">Login</Link> to like or purchase
              </p>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-16 max-w-2xl">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
            Comments <span className="text-gray-400 font-normal text-lg">({comments.length})</span>
          </h2>

          {/* Add comment */}
          {user ? (
            <form onSubmit={handleComment} className="flex gap-3 mb-8">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:border-red-400 transition-all"
                />
                <button type="submit" disabled={!commentText.trim()} className="btn-primary p-2.5 rounded-full disabled:opacity-50">
                  <Send size={16} />
                </button>
              </div>
            </form>
          ) : (
            <div className="mb-8 p-4 bg-gray-50 rounded-2xl text-center">
              <p className="text-sm text-gray-500">
                <Link to="/login" className="text-red-600 font-semibold hover:underline">Login</Link> to leave a comment
              </p>
            </div>
          )}

          {/* Comments list */}
          <div className="space-y-4">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3 group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {c.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-gray-900">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                      {/* Fix: compare as numbers */}
                      {user && (Number(user.id) === Number(c.user_id) || user.role === 'admin') && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{c.text}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <MessageCircle size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No comments yet. Be the first!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
