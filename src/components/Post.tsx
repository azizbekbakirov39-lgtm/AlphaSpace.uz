import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Bookmark, Share2, ChevronLeft, ChevronRight, Info, Store, Send, Volume2, VolumeX } from 'lucide-react';
import { PostData, OutfitItem } from '../types';
import CommentDrawer from './CommentDrawer';
import ProductDetails from './ProductDetails';

import { Language, translations } from '../translations';

interface PostProps {
  post: PostData;
  isActive: boolean;
  onToggleLike?: () => void;
  onToggleSave?: () => void;
  onOpenReels?: () => void;
  onOpenShopProfile?: (shopId: string) => void;
  onOpenDetails?: () => void;
  onOpenComments?: () => void;
  onSharePost?: () => void;
  onToggleSubscribe?: () => void;
  language: Language;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

const Post: React.FC<PostProps> = ({ 
  post, 
  isActive, 
  onToggleLike, 
  onToggleSave, 
  onOpenReels, 
  onOpenShopProfile, 
  onOpenDetails,
  onOpenComments,
  onSharePost,
  onToggleSubscribe,
  language,
  isMuted = true,
  onToggleMute
}) => {
  const t = translations[language];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [showHeart, setShowHeart] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef<number>(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);
  const touchStartTime = useRef<number>(0);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMediaClick = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
      if (!post.isLiked && onToggleLike) {
        onToggleLike();
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 1000);
      }
    } else {
      // Single tap - wait for potential second tap
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
      tapTimeout.current = setTimeout(() => {
        if (onOpenReels) onOpenReels();
      }, DOUBLE_TAP_DELAY);
    }
    lastTap.current = now;
  };

  const handleShopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenShopProfile) {
      onOpenShopProfile(post.seller.id);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartPos.current.x);
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartPos.current.y);
    const duration = Date.now() - touchStartTime.current;
    
    // If movement is very small AND it was a quick touch AND we are not scrolling
    // This ensures that swiping doesn't trigger Reels
    if (deltaX < 15 && deltaY < 15 && duration < 300 && !isScrolling.current) {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      
      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
        // Double tap detected
        if (tapTimeout.current) clearTimeout(tapTimeout.current);
        if (!post.isLiked && onToggleLike) {
          onToggleLike();
          setShowHeart(true);
          setTimeout(() => setShowHeart(false), 1000);
        }
      } else {
        // Single tap - wait for potential second tap
        if (tapTimeout.current) clearTimeout(tapTimeout.current);
        tapTimeout.current = setTimeout(() => {
          if (onOpenReels) onOpenReels();
        }, DOUBLE_TAP_DELAY);
      }
      lastTap.current = now;
    }
    touchStartPos.current = null;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    isScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false;
    }, 150);

    const scrollPos = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollPos / width);
      if (newIndex !== currentImageIndex) {
        setCurrentImageIndex(newIndex);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive]);

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (carouselRef.current && currentImageIndex < post.mediaUrls.length - 1) {
      const nextIndex = currentImageIndex + 1;
      carouselRef.current.scrollTo({
        left: nextIndex * carouselRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (carouselRef.current && currentImageIndex > 0) {
      const prevIndex = currentImageIndex - 1;
      carouselRef.current.scrollTo({
        left: prevIndex * carouselRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  // Removed handleDragEnd as we use native scroll

  const handleInternalShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSharePost) {
      onSharePost();
    }
  };

  const handleExternalShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: post.seller.name,
      text: post.outfitName,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        try {
          await navigator.clipboard.writeText(window.location.href);
          alert('Link copied to clipboard!');
        } catch (clipErr) {
          console.error('Clipboard fallback failed:', clipErr);
        }
      }
    }
  };

  return (
    <div className="w-full bg-bg-primary flex flex-col border-b border-border-primary pb-4">
      {/* Top Header - Premium Shop Card Style */}
      <div className="mx-3 mt-3 mb-2 p-3 bg-white dark:bg-zinc-900/50 backdrop-blur-md rounded-2xl shadow-sm border border-border-primary/50 flex items-center justify-between group transition-all hover:shadow-md">
        <div 
          className="flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity flex-1"
          onClick={handleShopClick}
        >
          <div className={`flex-shrink-0 p-[2px] rounded-full ${post.seller.hasStory ? 'bg-accent-light shadow-sm shadow-accent-light/20' : 'bg-text-primary/10'}`}>
            <div className="p-[1.5px] bg-bg-primary rounded-full">
              {post.seller.logo ? (
                <img 
                  src={post.seller.logo} 
                  alt={post.seller.name} 
                  className="w-10 h-10 rounded-full object-cover aspect-square"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-accent-blue">
                  <Store size={20} strokeWidth={1.5} />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-text-primary font-black text-sm tracking-tight uppercase">{post.seller.name}</span>
              {post.seller.followers > 1000 && (
                <div className="bg-accent-blue/10 text-accent-blue text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                  Top
                </div>
              )}
            </div>
            <span className="text-text-secondary text-[10px] font-bold uppercase tracking-wider opacity-70">
              {post.seller.categories[0] || "Do'kon"} • {post.seller.followers.toLocaleString()} {language === 'uz' ? 'obunachi' : 'followers'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            className="px-3 py-1.5 bg-accent-blue/5 hover:bg-accent-blue/10 text-accent-blue text-[10px] font-black rounded-lg uppercase tracking-widest transition-all active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleSubscribe) onToggleSubscribe();
            }}
          >
            {post.seller.isSubscribed ? (language === 'uz' ? "Kuzatilyapti" : "Following") : (language === 'uz' ? "Kuzatish" : "Follow")}
          </button>
          <button 
            className="text-text-primary/30 hover:text-text-primary transition-colors p-1"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenDetails) onOpenDetails();
            }}
          >
            <Info size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div 
        className="relative w-full aspect-[4/5] bg-neutral-900 flex items-center justify-center overflow-hidden touch-pan-y"
      >
        {/* Heart Animation on Double Tap */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            >
              <Heart size={80} fill="#ef4444" className="text-red-500 drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {post.mediaType === 'video' ? (
          <div 
            className="w-full h-full cursor-pointer relative"
            onClick={handleMediaClick}
          >
            <video
              ref={videoRef}
              src={post.mediaUrls[0]}
              className="w-full h-full object-cover"
              loop
              muted={isMuted}
              playsInline
            />
            
            {/* Mute/Unmute Toggle */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleMute) onToggleMute();
              }}
              className="absolute bottom-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white z-10 hover:bg-black/60 transition-all active:scale-90"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <div 
              ref={carouselRef}
              onScroll={handleScroll}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={handleMediaClick}
              className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-x touch-pan-y"
              style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
            >
              {post.mediaUrls.map((url, idx) => (
                <div 
                  key={idx} 
                  className="min-w-full h-full snap-center snap-always flex-shrink-0"
                  style={{ scrollSnapStop: 'always' }}
                >
                  <img
                    src={url}
                    className="w-full h-full object-cover pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
            
            {/* Carousel Controls */}
            {post.mediaUrls.length > 1 && (
              <>
                {currentImageIndex > 0 && (
                  <button 
                    onClick={handlePrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white z-10"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                {currentImageIndex < post.mediaUrls.length - 1 && (
                  <button 
                    onClick={handleNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white z-10"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Click Overlay removed - handled by touch events on carousel */}

        {/* Outfit Icons removed as per user request */}
      </div>

      {/* Interaction Buttons - Below Media */}
      <div className="px-3 py-3 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <motion.button 
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleLike) onToggleLike();
            }}
            className={`transition-colors duration-300 ${post.isLiked ? 'text-[#ef4444]' : 'text-text-primary'}`}
          >
            <Heart size={30} fill={post.isLiked ? '#ef4444' : 'none'} strokeWidth={1.5} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.8 }}
            className="text-text-primary"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenComments) onOpenComments();
            }}
          >
            <MessageCircle size={30} strokeWidth={1.5} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.8 }}
            className="text-text-primary"
            onClick={handleInternalShare}
          >
            <Send size={30} strokeWidth={1.5} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.8 }}
            className="text-text-primary"
            onClick={handleExternalShare}
          >
            <Share2 size={30} strokeWidth={1.5} />
          </motion.button>
        </div>
        
        {/* Carousel Dots */}
        {post.mediaType === 'carousel' && post.mediaUrls.length > 1 && (
          <div className="flex gap-1.5">
            {post.mediaUrls.map((_, idx) => (
              <div 
                key={idx}
                className={`rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-3 h-1.5 bg-accent-blue' : 'w-1.5 h-1.5 bg-text-primary/20'}`}
              />
            ))}
          </div>
        )}

        <motion.button 
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleSave) onToggleSave();
          }}
          className={`transition-colors duration-300 ${post.isSaved ? 'text-accent-blue' : 'text-text-primary'}`}
        >
          <Bookmark size={30} fill={post.isSaved ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </motion.button>
      </div>

      {/* Post Info */}
      <div className="px-4 flex flex-col gap-1">
        <p className="text-text-primary text-sm font-bold">
          {(post.likes + (post.isLiked ? 1 : 0)).toLocaleString()} {t.likes}
        </p>
        <div className="flex flex-wrap items-baseline gap-2 mb-1">
          <span className="text-text-primary text-sm font-bold">{post.seller.name}</span>
          <span className="text-text-primary/90 text-sm font-light">{post.outfitName}</span>
        </div>
        
        {/* Royal Blue Price */}
        <div className="mt-5 flex items-center justify-between">
          <div>
            <span className="bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent font-black text-3xl tracking-tight">
              {post.price}
            </span>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenDetails) onOpenDetails();
            }}
            className="px-6 py-3 bg-gradient-to-r from-accent-blue to-accent-light hover:shadow-lg hover:shadow-accent-blue/20 text-white rounded-xl font-black tracking-wide text-xs uppercase transition-all active:scale-95 shadow-md shadow-accent-blue/10"
          >
            {t.shop_now}
          </button>
        </div>
        
        <button 
          className="text-text-primary/40 text-xs mt-1 text-left"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenComments) onOpenComments();
          }}
        >
          {t.view_comments.replace('{count}', post.comments.toString())}
        </button>
      </div>
      {/* Comment Drawer and Product Details moved to global level in App.tsx */}
    </div>
  );
};

export default Post;
