/**
 * Lazy poster key art. It intentionally does not opacity-fade: WebKit pauses
 * transitions in background panes, which can otherwise leave loaded artwork
 * invisible until the tab receives focus.
 */
export function PosterImage({
  src,
  position,
}: {
  src: string;
  position?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className="absolute inset-0 size-full object-cover"
      style={{ objectPosition: position }}
    />
  );
}
