import { useEffect, useRef } from 'react';

const EMOJIS = [
  '😀','😂','😍','🥰','😎','🤩','😊','🙏','👍','❤️',
  '🔥','✨','🎨','🖼️','💰','💎','🌟','👏','🎉','💯',
  '😮','🤔','😅','😭','🥺','😤','🤝','👋','💪','🎭',
];

export default function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="mb-2 p-3 bg-white rounded-2xl shadow-xl border border-gray-100 grid grid-cols-10 gap-1">
      {EMOJIS.map(e => (
        <button
          key={e}
          onClick={() => onSelect(e)}
          className="text-xl hover:bg-red-50 rounded-lg p-1 transition-colors"
        >
          {e}
        </button>
      ))}
    </div>
  );
}
