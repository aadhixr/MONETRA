// AURIX - Category Icon Component
import React from 'react';
import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  color?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  className = 'w-5 h-5',
  color,
  size = 20,
}) => {
  // Normalize icon name
  const IconComponent = (Icons as any)[name] || Icons.CircleDollarSign;

  return (
    <div
      className={`flex items-center justify-center rounded-xl p-2.5 transition-transform ${className}`}
      style={{
        backgroundColor: color ? `${color}20` : '#E7FF3220',
        color: color || '#E7FF32',
      }}
    >
      <IconComponent size={size} strokeWidth={2} />
    </div>
  );
};

