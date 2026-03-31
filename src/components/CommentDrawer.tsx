import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send } from 'lucide-react';

interface Comment {
  id: string;
  user: string;
  text: string;
  time: string;
  uid?: string;
  createdAt?: string;
}

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postTitle?: string;
  postId?: string;
  comments?: Comment[];
  onAddComment?: (postId: string, text: string) => void;
  user?: any;
}

const CommentDrawer: React.FC<CommentDrawerProps> = ({ 
  isOpen, 
  onClose, 
  postTitle, 
  postId, 
  comments = [], 
  onAddComment,
  user
}) => {
  const [commentText, setCommentText] = useState('');
  const onCloseRef = React.useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleAddComment = () => {
    if (!commentText.trim() || !postId || !onAddComment) return;
    onAddComment(postId, commentText);
    setCommentText('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            className="absolute bottom-0 left-0 right-0 h-[80%] bg-white rounded-t-[32px] z-[1001] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Drag Handle Area */}
            <div className="w-full py-4 cursor-grab active:cursor-grabbing flex-shrink-0 flex items-center justify-center">
              <div className="w-12 h-1.5 bg-neutral-200 rounded-full" />
            </div>
            
            <div className="px-6 pb-4 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-sm text-black">
                {postTitle ? `${postTitle} - Izohlar` : 'Izohlar'}
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-black">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-400 space-y-2">
                  <p className="text-sm font-bold uppercase tracking-widest">Hozircha izohlar yo'q</p>
                  <p className="text-xs">Birinchi bo'lib izoh qoldiring!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue/10 to-accent-light/10 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-accent-blue border border-accent-blue/20 overflow-hidden">
                      {comment.user[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-black">{comment.user}</span>
                        <span className="text-[10px] text-neutral-400">{comment.time}</span>
                      </div>
                      <p className="text-sm text-neutral-700">{comment.text}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <button className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:text-accent-blue transition-colors">Javob berish</button>
                        <button className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:text-accent-blue transition-colors">Yoqdi</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-neutral-100 bg-white pb-8">
              {!user ? (
                <div className="text-center py-2">
                  <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Izoh qoldirish uchun tizimga kiring</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-200 focus-within:border-accent-blue transition-colors">
                  <input 
                    type="text" 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Izoh qoldiring..." 
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none text-black"
                  />
                  <button 
                    onClick={handleAddComment}
                    className={`p-1 transition-all ${commentText.trim() ? 'text-accent-blue scale-110' : 'text-neutral-300'}`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommentDrawer;
