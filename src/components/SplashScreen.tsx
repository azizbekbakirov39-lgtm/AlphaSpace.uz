import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // 6 seconds drawing + 4 seconds waiting = 10 seconds total
    const timer = setTimeout(() => {
      setIsFinished(true);
      setTimeout(onComplete, 800);
    }, 10000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isFinished ? 0 : 1 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="flex flex-col items-center gap-16">
        {/* Large Animated Logo (Tag Icon) */}
        <div className="relative">
          <motion.svg
            width="160"
            height="160"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            {/* Main Tag Path */}
            <motion.path
              d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ 
                duration: 3, 
                ease: "easeInOut",
                delay: 0.5 
              }}
            />
            {/* Tag Hole */}
            <motion.path
              d="M7 7h.01"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ 
                duration: 0.8, 
                delay: 2.8 
              }}
            />
          </motion.svg>
          
          {/* Subtle Glow */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-white blur-[80px] rounded-full -z-10"
          />
        </div>

        {/* Handwriting Text "AlphaSpace" - Simulated Drawing Reveal */}
        <div className="relative">
          <motion.div
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ 
              duration: 3, 
              delay: 3.5, 
              ease: "linear" 
            }}
          >
            <h1 
              className="text-7xl md:text-9xl text-white font-cursive tracking-tight"
              style={{ fontFamily: "'Dancing Script', cursive" }}
            >
              AlphaSpace
            </h1>
          </motion.div>

          {/* iPhone-style Shimmer Effect */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ 
              duration: 3, 
              delay: 7, 
              repeat: Infinity, 
              repeatDelay: 1,
              ease: "linear"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
          />
        </div>
      </div>

      {/* Subtle Progress Line */}
      <div className="absolute bottom-20 w-64 h-[1px] bg-white/10 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 10, ease: "linear" }}
          className="h-full bg-white/30"
        />
      </div>
    </motion.div>
  );
};

export default SplashScreen;
