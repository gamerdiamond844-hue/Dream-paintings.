import { useState, useRef } from 'react';
import { Upload, Image, DollarSign, Tag, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const CATEGORIES = ['Abstract', 'Landscape', 'Portrait', 'Still Life', 'Modern', 'Traditional', 'Watercolor', 'Oil', 'Digital'];

export default function SubmitPainting() {
  const [form, setForm] = useState({ title: '', description: '', price: '', category: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) { setFile(f); setPreview(URL.createObjectURL(f)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please upload an image');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('image', file);
      await api.post('/paintings', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
    setLoading(false);
  };

  if (submitted) return (
    <div className="content-layer min-h-screen flex items-center justify-center pt-16">
      <div className="text-center max-w-md px-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">Submitted!</h2>
        <p className="text-gray-500 mb-6">Your painting has been submitted for review. You'll be notified once it's approved.</p>
        <button onClick={() => { setSubmitted(false); setForm({ title: '', description: '', price: '', category: '' }); setFile(null); setPreview(null); }}
          className="btn-primary px-6 py-3 rounded-full font-semibold">
          Submit Another
        </button>
      </div>
    </div>
  );

  return (
    <div className="content-layer min-h-screen pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-2">Submit Painting</h1>
        <p className="text-gray-500 mb-8">Your submission will be reviewed by our team</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image upload */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${preview ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-red-300 hover:bg-red-50'}`}>
            {preview ? (
              <img src={preview} alt="" className="max-h-64 mx-auto rounded-xl object-contain" />
            ) : (
              <div>
                <Image size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Drop image here or click to upload</p>
                <p className="text-gray-400 text-sm mt-1">JPG, PNG, WebP up to 10MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><FileText size={14} /> Title</label>
            <input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Painting title"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={4} placeholder="Describe your painting, technique, inspiration..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><DollarSign size={14} /> Price (₹)</label>
              <input type="number" required min="1" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="5000"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><Tag size={14} /> Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all bg-white">
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-base">
            {loading ? <LoadingSpinner size="sm" /> : <><Upload size={18} /> Submit for Review</>}
          </button>
        </form>
      </div>
    </div>
  );
}
