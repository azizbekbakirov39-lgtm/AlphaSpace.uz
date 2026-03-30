import React from 'react';
import { motion } from 'motion/react';
import { Store } from 'lucide-react';
import { Story } from '../types';
import { Language } from '../translations';

interface StoryBarProps {
  stories: Story[];
  onMarkStoryViewed: (storyId: string) => void;
  onOpenStories: (stories: Story[], index: number) => void;
  onOpenLive: (story: Story) => void;
  language: Language;
}

const StoryBar: React.FC<StoryBarProps> = ({ stories, onMarkStoryViewed, onOpenStories, onOpenLive, language }) => {
  // Sort stories: live first, then unviewed, then viewed
  const sortedStories = React.useMemo(() => {
    return [...stories].sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.isViewed === b.isViewed) return 0;
      return a.isViewed ? 1 : -1;
    });
  }, [stories]);

  const handleStoryClick = (story: Story, index: number) => {
    if (story.isLive) {
      onOpenLive(story);
    } else {
      onOpenStories(sortedStories, index);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2 px-4">
      {sortedStories.map((story, index) => (
        <div 
          key={story.id} 
          onClick={() => handleStoryClick(story, index)}
          className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
        >
          <div className={`p-[2px] rounded-full transition-all duration-500 relative ${
            story.isLive 
              ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse' 
              : story.isViewed 
                ? 'bg-text-primary/10' 
                : 'bg-accent-light shadow-lg shadow-accent-light/20'
          } group-active:scale-95`}>
            <div className="p-[2.5px] bg-bg-primary rounded-full">
              {story.seller.logo ? (
                <img 
                  src={story.seller.logo} 
                  alt={story.seller.name} 
                  className={`w-20 h-20 rounded-full object-cover transition-opacity ${
                    story.isLive 
                      ? 'opacity-100' 
                      : story.isViewed 
                        ? 'opacity-50' 
                        : 'opacity-90 group-hover:opacity-100'
                  }`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`w-20 h-20 rounded-full bg-white flex items-center justify-center text-accent-blue transition-opacity ${
                  story.isLive 
                    ? 'opacity-100' 
                    : story.isViewed 
                      ? 'opacity-50' 
                      : 'opacity-90 group-hover:opacity-100'
                }`}>
                  <Store size={40} strokeWidth={1.5} />
                </div>
              )}
            </div>
            {story.isLive && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest text-white border-2 border-bg-primary">
                Live
              </div>
            )}
          </div>
          <span className={`text-[10px] font-bold tracking-tight truncate w-20 text-center uppercase ${
            story.isLive 
              ? 'text-red-500' 
              : story.isViewed 
                ? 'text-text-primary/40' 
                : 'text-text-primary/80'
          }`}>
            {story.seller.name}
          </span>
        </div>
      ))}
    </div>
  );
};

export default StoryBar;
