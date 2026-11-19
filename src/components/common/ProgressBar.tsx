// AURIX - Sleek Thin Financial Progress Bar
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ProgressBarProps {
  value: number;
  max: number;
  height?: string;
  variant?: 'auto' | 'neon' | 'warning' | 'danger';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  height = 'h-2',
  variant = 'auto',
  className,
}) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const isOverBudget = max > 0 && value > max;

  let fillColor = 'bg-[#E7FF32]'; // Neon lime default

  if (variant === 'auto') {
    if (isOverBudget || percentage >= 100) {
      fillColor = 'bg-[#FF6868]'; // Coral Red
    } else if (percentage >= 90) {
      fillColor = 'bg-[#FFD166]'; // Amber Warning
    } else if (percentage >= 75) {
      fillColor = 'bg-[#C9E927]'; // Secondary Lime Warning
    }
  } else if (variant === 'warning') {
    fillColor = 'bg-[#FFD166]';
  } else if (variant === 'danger') {
    fillColor = 'bg-[#FF6868]';
  }

  return (
    <div
      className={twMerge(
        clsx('w-full bg-[#151812] border border-[#30352B]/60 rounded-full overflow-hidden', height, className)
      )}
    >
      <div
        className={clsx('h-full rounded-full transition-all duration-500 ease-out', fillColor)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

