import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-white dark:bg-[#202430] shadow-panel ${
                t.type === 'success'
                  ? 'border-[#15803D]/30'
                  : t.type === 'error'
                  ? 'border-[#B91C1C]/30'
                  : 'border-[#4F46E5]/30'
              }`}
            >
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-[#4F46E5] shrink-0 mt-0.5" />}
              <span className="text-sm font-medium text-[#171923] dark:text-[#F9FAFB] flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-[#626B7A] hover:text-[#171923] dark:text-[#A7AFBD] dark:hover:text-[#F9FAFB] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  return useContext(ToastContext);
}

export default ToastProvider;