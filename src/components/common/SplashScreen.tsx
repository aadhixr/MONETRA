// AURIX - Cinematic App Opening Splash Animation
import React, { useState, useEffect, useRef } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [stage, setStage] = useState<'intro' | 'letters' | 'full'>('intro');
  const [visibleLetters, setVisibleLetters] = useState<number>(0);
  const hasFinishedRef = useRef(false);

  const WORD = 'AURIX';

  const handleFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 700);
  };

  useEffect(() => {
    // Stage 1: Icon entrance and ambient bloom (0 - 500ms)
    const t1 = setTimeout(() => {
      setStage('letters');
    }, 500);

    // Stage 2: Reveal letters A - U - R - I - X sequentially (600ms - 1800ms)
    const letterTimers: NodeJS.Timeout[] = [];
    for (let i = 1; i <= WORD.length; i++) {
      letterTimers.push(
        setTimeout(() => {
          setVisibleLetters(i);
        }, 550 + i * 220)
      );
    }

    // Stage 3: Full lockup glow and hold (2200ms)
    const t2 = setTimeout(() => {
      setStage('full');
    }, 2000);

    // Stage 4: Smooth transition out into dashboard (3200ms)
    const t3 = setTimeout(() => {
      handleFinish();
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      letterTimers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      onClick={handleFinish}
      style={{ backgroundColor: '#08090A' }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden cursor-pointer select-none transition-all duration-700 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      title="Click or tap anywhere to skip"
    >
      {/* Ambient background bloom */}
      <div className="absolute inset-0 bg-radial-at-c from-[#D4AF37]/10 via-transparent to-[#08090A] pointer-events-none animate-pulse" />

      {/* Main Brand Lockup */}
      <div className="relative flex flex-col items-center justify-center p-6 space-y-6">
        {/* Animated App Squircle Icon */}
        <div className="relative transition-all duration-1000 ease-out transform">
          <div className="absolute -inset-4 bg-gradient-to-r from-[#D4AF37]/20 to-[#F8FAFC]/10 rounded-3xl blur-2xl opacity-60 animate-pulse pointer-events-none" />
          <img
            src="/logo.jpg"
            alt="AURIX"
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl shadow-2xl border border-[#30352B]/80 object-cover ring-1 ring-[#D4AF37]/40 relative z-10 transition-transform duration-700 hover:scale-105"
          />
        </div>

        {/* Sequential Typographic Reveal: A U R I X */}
        <div className="flex flex-col items-center space-y-2 relative z-10">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {WORD.split('').map((char, idx) => (
              <span
                key={idx}
                className={`text-2xl sm:text-3xl font-black tracking-[0.25em] transition-all duration-500 ease-out ${
                  idx < visibleLetters
                    ? 'opacity-100 translate-y-0 text-white scale-100 drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                    : 'opacity-0 translate-y-2 text-[#A1A69A]/30 scale-90'
                }`}
              >
                {char}
              </span>
            ))}
          </div>

          <div
            className={`text-[10px] sm:text-xs font-mono tracking-[0.3em] uppercase text-[#D4AF37]/90 transition-all duration-700 ${
              stage === 'full' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            Institutional Wealth & Ledger
          </div>
        </div>
      </div>

      {/* Subtle Skip Prompt for swift UX */}
      <div className="absolute bottom-6 sm:bottom-8 z-10 flex items-center space-x-2 text-[#A1A69A]/40 hover:text-[#D4AF37] transition-colors text-xs font-mono tracking-widest uppercase">
        <span>Tap anywhere to enter</span>
        <span className="text-[10px] animate-pulse">❯❯</span>
      </div>
    </div>
  );
};
