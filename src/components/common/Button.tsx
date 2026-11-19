// AURIX - Common Button Component
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-[#E7FF32] text-[#090B08] hover:bg-[#C9E927] font-semibold shadow-sm',
    secondary: 'bg-[#23281F] text-white hover:bg-[#30352B] border border-[#30352B]',
    outline: 'bg-transparent text-white border border-[#30352B] hover:border-[#E7FF32] hover:text-[#E7FF32]',
    ghost: 'bg-transparent text-[#A1A69A] hover:text-white hover:bg-[#1C2019]',
    danger: 'bg-[#FF6868]/15 text-[#FF6868] border border-[#FF6868]/30 hover:bg-[#FF6868]/25',
  };

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
    md: 'text-sm px-4 py-2.5 h-11 gap-2',
    lg: 'text-base px-6 py-3.5 h-13 gap-2.5',
    icon: 'p-2.5 h-10 w-10',
  };

  return (
    <button
      className={twMerge(
        clsx(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

