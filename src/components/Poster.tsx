import { ViewTransition, type CSSProperties } from "react";
import { PosterImage } from "@/components/PosterImage";
import { Show } from "@/lib/shows";
import posterImages from "@/lib/posters.json";

const POSTER_SRC: Record<string, string> = posterImages;

/** Crop tuning for landscape key art whose focal point isn't centered. */
const POSTER_POSITION: Record<string, string> = {
  "little-shop-of-horrors": "35% center",
  "the-gin-game": "30% center",
  "the-lion-king": "20% center",
  "buena-vista-social-club": "22% center",
  "joe-turners-come-and-gone": "30% center",
  "broad-strokes": "62% center",
  "the-potluck": "center 18%",
  "shifters": "center 35%",
};

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
 *
 * `name` opts the poster into a shared-element morph across navigations
 * (view transitions). Names must be unique per page — callers that can
 * render the same show twice must dedupe (see DiscoverPage's claimName).
 */
export function Poster({
  show,
  className = "",
  name,
}: {
  show: Show;
  className?: string;
  name?: string;
}) {
  const { poster } = show;
  const src = POSTER_SRC[show.slug];

  const withMorph = (tile: React.ReactNode) =>
    name ? (
      <ViewTransition name={name} share="poster-morph">
        {tile}
      </ViewTransition>
    ) : (
      tile
    );

  if (src) {
    return withMorph(
      <div
        aria-hidden
        className={`relative aspect-square shrink-0 overflow-hidden ${className}`}
        style={{ background: poster.bg }}
      >
        <PosterImage src={src} position={POSTER_POSITION[show.slug]} />
      </div>,
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

  return withMorph(
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
