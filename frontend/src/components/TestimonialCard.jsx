import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const TestimonialCard = ({ testimonial }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      viewport={{ once: true }}
      className="glass bg-white/70 border border-white/60 rounded-3xl p-10 max-w-md mx-auto shadow-2xl hover:shadow-red-200/50 hover:-translate-y-2 transition-all duration-500 backdrop-blur-xl"
    >
      <div className="flex gap-1 mb-6 text-yellow-400">
        <Star fill="currentColor" size={20} />
        <Star fill="currentColor" size={20} />
        <Star fill="currentColor" size={20} />
        <Star fill="currentColor" size={20} />
        <Star fill="currentColor" size={20} />
      </div>
      <blockquote className="text-gray-700 text-lg leading-relaxed italic mb-8 font-medium">
        "{testimonial.quote}"
      </blockquote>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-red-400/20 to-rose-400/20">
          <img 
            src={testimonial.avatar} 
            alt={testimonial.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 text-lg font-display">{testimonial.name}</h4>
          <p className="text-gray-500 text-sm">{testimonial.role}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default TestimonialCard;

