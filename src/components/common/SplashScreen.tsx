// MONETRA V3 - Cinematic App Opening Splash Animation
import React, { useState, useEffect, useRef } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 3200,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasFinishedRef = useRef(false);

  const handleFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 700);
  };

  useEffect(() => {
    // Safety fallback: if video stalls or fails to play, dismiss after max 9.5s
    const maxTimer = setTimeout(() => {
      handleFinish();
    }, 9500);

    return () => clearTimeout(maxTimer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set playback speed slightly snappier (1.15x) for optimal app opening pace
    video.playbackRate = 1.15;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy prevented video playback; fallback smoothly
        setIsVideoLoaded(true);
      });
    }
  }, []);

  return (
    <div
      onClick={handleFinish}
      style={{ backgroundColor: '#010605' }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden cursor-pointer select-none transition-all duration-700 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      title="Click or tap anywhere to skip"
    >
      {/* Fullscreen responsive video - seamless boundary matching */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src="/monetra_splash.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setIsVideoLoaded(true)}
          onEnded={handleFinish}
          onError={handleFinish}
          style={{
            backgroundColor: '#010605',
            maskImage: 'radial-gradient(ellipse 92% 92% at 50% 50%, black 78%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 92% 92% at 50% 50%, black 78%, transparent 100%)',
          }}
          className="w-full h-full object-contain max-h-screen max-w-full select-none pointer-events-none"
        />
      </div>

      {/* Subtle Skip Prompt for swift UX */}
      <div className="absolute bottom-6 sm:bottom-8 z-10 flex items-center space-x-2 text-[#A1A69A]/50 hover:text-[#E7FF32] transition-colors text-xs font-mono tracking-widest uppercase">
        <span>Tap anywhere to enter</span>
        <span className="text-[10px] animate-pulse">❯❯</span>
      </div>
    </div>
  );
};
