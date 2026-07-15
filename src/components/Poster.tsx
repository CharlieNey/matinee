import type { CSSProperties } from "react";
import { Show } from "@/lib/shows";
import posterImages from "@/lib/posters.json";

const POSTER_SRC: Record<string, string> = posterImages;

/** Crop tuning for landscape key art whose focal point isn't centered. */
const POSTER_POSITION: Record<string, string> = {};

const STYLE_CLASSES: Record<Show["poster"]["style"], string> = {
  brush: "italic font-extrabold tracking-tight",
  serif: "font-serif font-bold",
  sans: "font-extrabold tracking-tight",
  condensed: "font-extrabold uppercase tracking-tighter",
};

function titleSize(title: string): string {
  const len = title.length;
  if (len <= 8) return "23cqw";
  if (len <= 14) return "18cqw";
  if (len <= 22) return "14.5cqw";
  return "11cqw";
}

/**
 * Show poster: real key art from /public/posters when available (see
 * src/lib/posters.json), otherwise a typographic tile derived from the
 * show's palette. Square, scales with its container (cqw units).
 */
export function Poster({
  show,
  className = "",
}: {
  show: Show;
  className?: string;
}) {
  const { poster } = show;
  const src = POSTER_SRC[show.slug];

  if (src) {
    return (
      <div
        aria-hidden
        className={`relative aspect-square shrink-0 overflow-hidden ${className}`}
        style={{ background: poster.bg }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
          style={{ objectPosition: POSTER_POSITION[show.slug] }}
        />
      </div>
    );
  }
  const lettering = poster.displayTitle ?? show.title;
  const titleStyle: CSSProperties = {
    color: poster.fg,
    fontSize: titleSize(lettering),
    lineHeight: 1.02,
    transform: [
      poster.tilt ? `rotate(${poster.tilt}deg)` : "",
      poster.style === "condensed" ? "scaleY(1.12)" : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined,
  };

  return (
    <div
      aria-hidden
      className={`relative aspect-square shrink-0 overflow-hidden ${className}`}
      style={{ background: poster.bg, containerType: "inline-size" }}
    >
      {/* stage-light sheen + floor vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 70% at 22% 0%, rgb(255 255 255 / 0.16), transparent 55%), linear-gradient(to top, rgb(0 0 0 / 0.18), transparent 40%)",
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3cqw] p-[9cqw] text-center">
        <span
          className={`text-balance ${STYLE_CLASSES[poster.style]}`}
          style={titleStyle}
        >
          {lettering}
        </span>
        {poster.caption && (
          <span
            className="font-medium uppercase"
            style={{
              color: poster.captionColor ?? poster.fg,
              fontSize: "5cqw",
              letterSpacing: "0.14em",
              opacity: 0.85,
            }}
          >
            {poster.caption}
          </span>
        )}
      </div>
    </div>
  );
}
