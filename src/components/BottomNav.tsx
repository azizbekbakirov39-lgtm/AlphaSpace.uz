import React from 'react';
import { Home, Sparkles, MapPin, User, Users } from 'lucide-react';
import { Language, translations } from '../translations';
import { useKeyboard } from '../hooks/useKeyboard';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, language }) => {
  const t = translations[language];
  const { isKeyboardOpen } = useKeyboard();
  
  const tabs = [
    { name: 'Home', icon: Home, label: t.home },
    { name: 'Brands', icon: Users, label: t.brands },
    { name: 'Search', icon: Sparkles, label: t.ai },
    { name: 'Live', icon: MapPin, label: t.live },
    { name: 'Profile', icon: User, label: t.profile },
  ];

  if (isKeyboardOpen) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-t border-border-primary px-4 py-3 pb-8">
      {/* SVG Gradient Definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="nav-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-blue)" />
            <stop offset="100%" stopColor="var(--color-accent-light)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex justify-between items-center max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;
          
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.3)]' : 'text-text-primary/30 hover:text-text-primary/50'}`}
            >
              <Icon 
                size={22} 
                strokeWidth={isActive ? 1.75 : 1.25} 
                stroke={isActive ? "url(#nav-gradient)" : "currentColor"}
              />
              <span className={`text-[8px] font-black tracking-widest uppercase transition-all duration-300 ${isActive ? 'bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent' : 'text-text-primary/30'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
