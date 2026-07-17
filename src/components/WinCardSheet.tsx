"use client";

import { useEffect, useState } from "react";
import { Forward } from "lucide-react";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { renderWinCard, shareImage } from "@/lib/shareCards";
import { Program, programKindLabel } from "@/lib/programs";
import { Show } from "@/lib/shows";

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
      <button
        type="button"
        disabled={!blob}
        onClick={handleShare}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform,opacity] duration-150 active:scale-[0.98] active:bg-vermilion-pressed disabled:opacity-40"
      >
        <Forward className="size-5" strokeWidth={2} />
        Share the win
      </button>
    </Sheet>
  );
}
