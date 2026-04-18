import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Palette, Image, Heart, Zap } from 'lucide-react';

const categories = [
  { id: 'abstract', name: 'Abstract', icon: Palette, color: 'from-purple-500 to-pink-500', count: '120+' },
  { id: 'modern', name: 'Modern', icon: Image, color: 'from-blue-500 to-indigo-500', count: '89+' },
  { id: 'portrait', name: 'Portrait', icon: Heart, color: 'from-red-500 to-orange-500', count: '67+' },
  { id: 'landscape', name: 'Landscape', icon: Zap, color: 'from-emerald-500 to-teal-500', count: '45+' },
  { id: 'surreal', name: 'Surreal', icon: Palette, color: 'from-fuchsia-500 to-violet-500', count: '34+' },
  { id: 'minimal', name: 'Minimal', icon: Image, color: 'from-gray-500 to-gray-400', count: '23+' },
];

const CategoryGrid = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-7xl mx-auto px-4">
      {categories.map((category, index) => {
        const Icon = category.icon;
        return (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05, y: -10 }}
            className="glass bg-white/80 border border-white/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-current/20 backdrop-blur-xl group hover:bg-gradient-to-br hover:from-red-50 hover:border-red-200/50 transition-all duration-400 cursor-pointer"
          >
            <Link to={`/gallery?category=${category.id}`} className="block">
              <div className={`w-12 h-12 mx-auto mb-4 p-3 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-all`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-1 group-hover:text-red-600 transition-colors font-display">{category.name}</h3>
              <p className="text-xs text-gray-500 text-center">{category.count}</p>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
};

export default CategoryGrid;

