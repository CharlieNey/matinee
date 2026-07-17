"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Poster key art with a fade-in on load, so lazy art blooms out of the
 * poster's own bg color instead of popping (DESIGN.md §6: poster-first).
 * `.complete` check covers cached images whose load event beat hydration.
 */
export function PosterImage({
  src,
  position,
}: {
  src: string;
  position?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      loading="lazy"
      onLoad={() => setLoaded(true)}
      className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ease-out ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
      style={{ objectPosition: position }}
    />
  );
}
