"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShareButton } from "@/components/ShareButton";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { renderWinCard, shareImage } from "@/lib/shareCards";
import { Program, programKindLabel } from "@/lib/programs";
import { Show } from "@/lib/shows";

/** Confetti in the house palette — paper over the dimmed velvet. */
const CONFETTI_COLORS = ["#A61E33", "#C9A227", "#F5EFE3", "#FFFFFF"];
const GRAVITY = 1350; // px/s²
const BURST_SECONDS = 2.2;

/**
 * One-shot confetti burst for the lottery win — the app's single loud
 * moment (DESIGN.md §7). Two paper poppers fire from the bottom corners
 * once the sheet has landed, arc over it, flutter down, and fade. Runs
 * once per open, never loops; skipped under prefers-reduced-motion.
 */
function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [done, setDone] = useState(false);
  // Client-only component (rendered inside the Sheet portal), so the
  // media query is readable at render time.
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    ctx.scale(dpr, dpr);

    const pieces = Array.from({ length: 110 }, (_, i) => {
      const left = i % 2 === 0;
      // Up and toward center stage; speed tuned to crest ~2/3 up the screen.
      const angle =
        ((left ? -72 : -108) + (Math.random() - 0.5) * 44) * (Math.PI / 180);
      const speed = Math.sqrt(
        2 * GRAVITY * vh * (0.5 + Math.random() * 0.35),
      );
      return {
        x: left ? vw * 0.06 : vw * 0.94,
        y: vh + 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 14,
        w: 5 + Math.random() * 5,
        h: 9 + Math.random() * 8,
        flut: Math.random() * Math.PI * 2,
        flutSpeed: 6 + Math.random() * 7,
        // Hold until the sheet's ~300ms spring has landed, then stagger.
        delay: 0.3 + Math.random() * 0.12,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      };
    });

    let raf = 0;
    let start = 0;
    let last = 0;
    const frame = (ts: number) => {
      if (!start) start = last = ts;
      const t = (ts - start) / 1000;
      const dt = Math.min((ts - last) / 1000, 0.032);
      last = ts;
      ctx.clearRect(0, 0, vw, vh);
      const alpha = t < 1.5 ? 1 : Math.max(0, 1 - (t - 1.5) / 0.6);
      ctx.globalAlpha = alpha;
      for (const p of pieces) {
        if (t < p.delay) continue;
        p.vy += GRAVITY * dt;
        p.vx *= Math.exp(-1.4 * dt); // air drag kills the sideways rush
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // Fake tumble: the strip narrows as it turns edge-on.
        ctx.scale(1, 0.25 + Math.abs(Math.sin(p.flut + t * p.flutSpeed)) * 0.75);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t < BURST_SECONDS) raf = requestAnimationFrame(frame);
      else setDone(true);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  if (done || reduced) return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      aria-hidden
      // Above the sheet (z-61) so the paper falls over it, never behind.
      className="pointer-events-none fixed inset-0 z-[70]"
    />,
    document.body,
  );
}

/**
 * The win card (Phase 11): congratulations + a share image of the artifact
 * people already screenshot into group chats — poster, price vs face value,
 * date. Rendered client-side the moment the sheet opens.
 */
export function WinCardSheet({
  open,
  onClose,
  program,
  show,
  now,
}: {
  open: boolean;
  onClose: () => void;
  program: Program;
  show: Show;
  now: Date | null;
}) {
  const toast = useToast();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let url: string | null = null;
    renderWinCard({
      show,
      kindLabel: programKindLabel(program.kind),
      price: program.price,
      date: now ?? new Date(),
    })
      .then((rendered) => {
        if (cancelled) return;
        url = URL.createObjectURL(rendered);
        setBlob(rendered);
        setPreviewUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setBlob(null);
      setPreviewUrl(null);
    };
  }, [open, program, show, now]);

  const handleShare = async () => {
    if (!blob) return;
    const result = await shareImage(
      blob,
      `matinee-win-${show.slug}.png`,
      `Won the ${programKindLabel(program.kind).toLowerCase()} for ${show.title}`,
    );
    toast({
      message:
        result === "shared" ? "Shared — congrats again!" : "Image downloaded",
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title="You won! 🎉">
      {/* Mounts fresh with the sheet's children each open, so the burst
          fires once per win; closing the sheet unmounts it mid-flight. */}
      <ConfettiBurst />
      <p className="mt-1 text-body text-ink-soft">
        ${program.price} against a ${show.faceValue} face value. Claim it
        before the window closes — then brag properly.
      </p>
      <div className="mt-5 overflow-hidden rounded-card bg-cream">
        {previewUrl ? (
          // Blob preview of the generated card — next/image can't optimize it
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Share card: won ${show.title} for $${program.price}`}
            className="w-full"
          />
        ) : (
          <div className="aspect-[4/5] w-full animate-pulse" />
        )}
      </div>
      <ShareButton
        label="Share the win"
        onShare={handleShare}
        disabled={!blob}
        className="mt-5"
      />
    </Sheet>
  );
}
