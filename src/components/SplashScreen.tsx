import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store } from 'lucide-react';

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
      <div className="flex flex-col items-center gap-10">
        {/* Large Animated Logo (Tag Icon) */}
        <div className="relative">
          <motion.svg
            width="160"
            height="160"
            viewBox="-3 0 27 24"
            fill="none"
            className="drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            {/* Thick Elegant White Chain Loop - Animated */}
            <motion.path
              d="M6.5 6.5C4 6.5 -1 4.5 -3 2M6.5 6.5C5 8.5 -1 9 -3 7"
              stroke="white"
              strokeWidth="1.0"
              strokeLinecap="round"
              opacity="0.8"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              transition={{ duration: 2, delay: 4.2 }}
            />

            {/* Main Tag Body - White */}
            <motion.path
              d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42z"
              fill="white"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ 
                duration: 3, 
                ease: "easeInOut",
                delay: 0.5 
              }}
            />

            {/* Uniform Inner Blue Border - Closer to Edge */}
            <motion.path
              d="M20.5 11.58l-8.5-8.5C11.7 2.7 11.3 2.5 11 2.5H4.5c-0.8 0-1.5 0.7-1.5 1.5v6.5c0 0.4 0.2 0.8 0.4 1.1l8.5 8.5c0.3 0.3 0.7 0.4 1.1 0.4s0.8-0.1 1.1-0.4l6.5-6.5c0.3-0.3 0.4-0.7 0.4-1.1s-0.1-0.8-0.4-1.1z"
              stroke="#3B82F6"
              strokeWidth="0.4"
              fill="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 1, delay: 3.8 }}
            />

            {/* Tag Hole - Blue */}
            <motion.circle
              cx="6.5"
              cy="6.5"
              r="1.2"
              fill="#3B82F6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ 
                duration: 0.8, 
                delay: 2.8 
              }}
            />

            {/* A.S Text - Centered in body */}
            <motion.text
              x="12"
              y="14"
              fill="#3B82F6"
              style={{ fontFamily: "'Dancing Script', cursive", fontSize: '7.5px', fontWeight: '1000' }}
              textAnchor="middle"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 1.5, 
                delay: 3.5,
                ease: "easeOut"
              }}
            >
              A.S
            </motion.text>
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
