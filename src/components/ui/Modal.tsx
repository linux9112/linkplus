import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className={`relative w-full ${maxWidth} bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl shadow-elevated z-10 overflow-hidden my-8`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#343B4B]">
              <h3 className="text-lg font-bold text-[#171923] dark:text-[#F9FAFB]">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#626B7A] hover:text-[#171923] hover:bg-slate-100 dark:text-[#A7AFBD] dark:hover:text-[#F9FAFB] dark:hover:bg-[#272D3A] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto text-[#424B5A] dark:text-[#D1D5DB]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;