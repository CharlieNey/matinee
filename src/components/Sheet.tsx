"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { X } from "lucide-react";
import { useLayoutMode } from "@/lib/useLayoutMode";

/**
 * Modal surface, presented per layout mode (DESIGN.md §10):
 * - Mobile: bottom sheet — springs up over a dimmed backdrop (§7, ~300ms),
 *   drag the grab handle down to dismiss. The drag starts from the handle
 *   only, so it never fights the sheet's inner scroll.
 * - Web: centered dialog at the 560px "intimate" width — scales/fades in,
 *   dismissed by the close button, backdrop, or Escape.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const dragControls = useDragControls();
  const web = useLayoutMode() === "web";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Portal to <body>: callers render sheets inside styled containers (e.g.
  // WebNav's backdrop-blur header), which would otherwise become the
  // containing block for our fixed overlay and trap it.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-espresso/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={onClose}
          />
          {web ? (
            <div className="pointer-events-none fixed inset-0 z-[61] flex items-center justify-center p-6">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="pointer-events-auto relative w-full max-w-[560px] overflow-hidden rounded-sheet border border-line bg-cream shadow-float"
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 12 }}
                transition={{ type: "spring", visualDuration: 0.25, bounce: 0.1 }}
              >
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="absolute right-3.5 top-3.5 z-10 grid size-9 place-items-center rounded-full text-ink-soft transition-colors duration-150 hover:bg-inset hover:text-ink"
                >
                  <X className="size-5" strokeWidth={2} />
                </button>
                <div className="max-h-[min(85dvh,760px)] overflow-y-auto px-6 pb-6 pt-5">
                  {title && <h2 className="pr-10 text-heading">{title}</h2>}
                  {children}
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="fixed inset-x-0 bottom-0 z-[61] mx-auto w-full max-w-[430px] rounded-t-sheet bg-cream"
              drag="y"
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.85 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 500) onClose();
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", visualDuration: 0.3, bounce: 0.15 }}
            >
              <div
                className="cursor-grab touch-none pb-1.5 pt-2.5 active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="mx-auto h-1 w-9 rounded-full bg-ink-faint/60" />
              </div>
              <div className="max-h-[82dvh] overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-2">
                {title && <h2 className="text-heading">{title}</h2>}
                {children}
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
