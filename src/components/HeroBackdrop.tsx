"use client";

import { FlutedGlass, MeshGradient } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";
import posterImages from "@/lib/posters.json";
import { Show } from "@/lib/shows";
import { useWebGL } from "@/lib/useWebGL";

const POSTER_SRC: Record<string, string> = posterImages;

/** Poster `bg` is often a CSS linear-gradient(); shaders want plain colors. */
function hexStops(value: string): string[] {
  return value.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
}

/**
 * Ambient stage backdrop for the web-mode show hero (DESIGN.md §11): the
 * show's own key art diffused behind fluted glass, or a slow wash of the
 * show's palette for typographic tiles. Decorative only — the cream gradient
 * on top keeps ink text readable, and poster art stays the color system.
 */
export function HeroBackdrop({ show }: { show: Show }) {
  const reduced = useReducedMotion();
  const webgl = useWebGL();
  const src = POSTER_SRC[show.slug];
  // Page surface behind the diffusion: House Velvet ivory (both modes).
  const surface = "#F5EFE3";
  const palette = [
    ...hexStops(show.poster.bg),
    ...hexStops(show.poster.fg),
    surface,
  ].slice(0, 6);

  // No WebGL: the show's flat palette under the same cream wash.
  if (!webgl) {
    return (
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: show.poster.bg }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-cream/55 via-cream/70 to-cream" />
      </div>
    );
  }

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {src ? (
        <FlutedGlass
          image={src}
          fit="cover"
          colorBack={surface}
          shape="lines"
          distortionShape="prism"
          size={0.22}
          distortion={0.5}
          shift={0.1}
          blur={0.35}
          edges={0}
          highlights={0.08}
          shadows={0.12}
          speed={0}
          className="absolute inset-0"
          width="100%"
          height="100%"
        />
      ) : (
        <MeshGradient
          colors={palette}
          distortion={0.7}
          swirl={0.2}
          speed={reduced ? 0 : 0.15}
          className="absolute inset-0"
          width="100%"
          height="100%"
        />
      )}
      {/* cream wash: art glows through, ink stays ~AA on top, bottom edge
          dissolves into the page background */}
      <div className="absolute inset-0 bg-gradient-to-b from-cream/55 via-cream/70 to-cream" />
    </div>
  );
}
