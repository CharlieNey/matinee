"use client";

import { StaticRadialGradient } from "@paper-design/shaders-react";
import { motion, useReducedMotion } from "motion/react";
import { useWebGL } from "@/lib/useWebGL";

/**
 * Follow spot for the espresso identity header (DESIGN.md §11): an
 * elliptical pool of tungsten light settled over the avatar + name, corners
 * falling to shadow — "dark frames you" made literal. The pool breathes via
 * a slow opacity cycle (ambient-shader exception to the no-loop rule);
 * reduced motion gets a static pool. The CSS gradient beneath remains the
 * no-WebGL fallback.
 */
export function FollowSpot({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const webgl = useWebGL();

  // The velvet CSS gradient beneath is the no-WebGL fallback.
  if (!webgl) return null;

  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      initial={false}
      animate={reduced ? { opacity: 0.9 } : { opacity: [0.72, 1, 0.72] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <StaticRadialGradient
        colorBack="#2A0912"
        colors={["#8E6B2A", "#5A1A2A", "#3A0D19"]}
        radius={0.9}
        falloff={0.35}
        mixing={0.6}
        distortion={0.15}
        offsetX={-0.35}
        offsetY={-0.35}
        speed={0}
        className="absolute inset-0"
        width="100%"
        height="100%"
      />
    </motion.div>
  );
}
