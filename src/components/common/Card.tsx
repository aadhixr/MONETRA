// AURIX - Common Financial Card Component
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'accent' | 'outlined';
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  glow = false,
  ...props
}) => {
  const baseStyles = 'rounded-[20px] p-4 transition-all duration-200 border';

  const variantStyles = {
    default: 'bg-[#1C2019] border-[#30352B] text-white',
    elevated: 'bg-[#23281F] border-[#30352B] shadow-lg text-white',
    accent: 'bg-[#1C2019] border-[#E7FF32] text-white',
    outlined: 'bg-transparent border-[#30352B] text-white',
  };

  const glowStyles = glow ? 'neon-glow border-[#E7FF32]' : '';

  return (
    <div
      className={twMerge(clsx(baseStyles, variantStyles[variant], glowStyles, className))}
      {...props}
    >
      {children}
    </div>
  );
};

