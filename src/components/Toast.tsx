"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";

type ToastInput = {
  message: string;
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((input: ToastInput) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = ++idRef.current;
    setToast({ ...input, id });
    timerRef.current = setTimeout(
      () => setToast((t) => (t?.id === id ? null : t)),
      input.action ? 4000 : 2400,
    );
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[118px] z-[70] flex justify-center px-6">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto flex items-center gap-3 rounded-full bg-espresso py-2.5 pl-4 pr-3 text-caption font-medium text-white shadow-float"
            >
              {toast.message}
              {toast.action ? (
                <button
                  type="button"
                  className="rounded-full px-2 py-0.5 text-caption font-semibold text-gold"
                  onClick={() => {
                    toast.action?.onClick();
                    setToast(null);
                  }}
                >
                  {toast.action.label}
                </button>
              ) : (
                <span className="pr-1" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
