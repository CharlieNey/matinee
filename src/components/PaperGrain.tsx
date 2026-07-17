"use client";

import { PaperTexture } from "@paper-design/shaders-react";
import { useWebGL } from "@/lib/useWebGL";

/**
 * Faint paper-stock grain under the cream page (DESIGN.md §11): the playbill
 * metaphor made literal. Sits above the body background and below all page
 * content, so white cards read as clean paper on grainy stock. Static —
 * speed 0 stops the render loop entirely after first paint.
 */
export function PaperGrain() {
  // No WebGL → plain cream stock; the grain is a garnish, not structure.
  if (!useWebGL()) return null;

  return (
    <PaperTexture
      aria-hidden
      colorBack="#00000000"
      colorFront="#241418"
      contrast={0.5}
      roughness={0.35}
      fiber={0.5}
      fiberSize={0.4}
      crumples={0}
      folds={0}
      drops={0.2}
      fade={0}
      speed={0}
      className="pointer-events-none fixed inset-0 opacity-[0.05]"
      width="100%"
      height="100%"
    />
  );
}
