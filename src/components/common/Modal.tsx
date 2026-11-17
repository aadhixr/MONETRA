// MONETRA V3 - Mobile Bottom Sheet & Dialog Modal
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = 'max-h-[92vh]',
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Surface: Bottom Sheet on Mobile, Centered on Tablet/Desktop */}
      <div
        className={`relative z-10 w-full ${maxWidth} bg-[#151812] border-t sm:border border-[#30352B] rounded-t-[28px] sm:rounded-[24px] shadow-2xl flex flex-col ${maxHeight} overflow-hidden animate-in slide-in-from-bottom duration-200`}
      >
        {/* Drag handle for mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#30352B] rounded-full" />
        </div>

        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#30352B]">
            <div>
              {title && <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>}
              {subtitle && <p className="text-xs text-[#A1A69A] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-[#A1A69A] hover:text-white hover:bg-[#1C2019] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
