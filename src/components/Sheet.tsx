"use client";

import { useEffect, useId, useRef } from "react";
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
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const mutedSiblings: {
      element: HTMLElement;
      inert: boolean;
      ariaHidden: string | null;
    }[] = [];
    const focusableSelector = [
      "button:not(:disabled)",
      "a[href]",
      "input:not(:disabled)",
      "textarea:not(:disabled)",
      "select:not(:disabled)",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ].filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (dialog) {
        for (const child of document.body.children) {
          if (
            !(child instanceof HTMLElement) ||
            child.contains(dialog) ||
            child.hasAttribute("data-sheet-backdrop") ||
            child.matches("script, style, link")
          )
            continue;
          mutedSiblings.push({
            element: child,
            inert: child.inert,
            ariaHidden: child.getAttribute("aria-hidden"),
          });
          child.inert = true;
          child.setAttribute("aria-hidden", "true");
        }
      }
      const initial = dialog?.querySelector<HTMLElement>("[data-sheet-close]");
      (initial ?? dialog)?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      for (const { element, inert, ariaHidden } of mutedSiblings) {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  // Portal to <body>: callers render sheets inside styled containers (e.g.
  // WebNav's backdrop-blur header), which would otherwise become the
  // containing block for our fixed overlay and trap it.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            data-sheet-backdrop
            aria-hidden="true"
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
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                aria-label={title ? undefined : "Dialog"}
                tabIndex={-1}
                className="pointer-events-auto relative w-full max-w-[560px] overflow-hidden rounded-sheet border border-line bg-cream shadow-float"
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 12 }}
                transition={{ type: "spring", visualDuration: 0.25, bounce: 0.1 }}
              >
                <button
                  type="button"
                  aria-label="Close"
                  data-sheet-close
                  onClick={onClose}
                  className="absolute right-3.5 top-3.5 z-10 grid size-9 place-items-center rounded-full text-ink-soft transition-colors duration-150 hover:bg-inset hover:text-ink"
                >
                  <X className="size-5" strokeWidth={2} />
                </button>
                <div className="max-h-[min(85dvh,760px)] overflow-y-auto px-6 pb-6 pt-5">
                  {title && (
                    <h2 id={titleId} className="pr-10 text-heading">
                      {title}
                    </h2>
                  )}
                  {children}
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-label={title ? undefined : "Dialog"}
              tabIndex={-1}
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
                <div className="flex min-h-9 items-center justify-between gap-4">
                  {title ? (
                    <h2 id={titleId} className="text-heading">
                      {title}
                    </h2>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    aria-label="Close"
                    data-sheet-close
                    onClick={onClose}
                    className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-soft transition-colors duration-150 active:bg-inset active:text-ink"
                  >
                    <X className="size-5" strokeWidth={2} />
                  </button>
                </div>
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
