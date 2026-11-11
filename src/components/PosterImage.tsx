import Image from "next/image";

/**
 * Responsive poster key art. Next serves an appropriately sized AVIF/WebP
 * variant while the square parent guarantees stable layout. It intentionally
 * does not opacity-fade: WebKit can pause background-tab transitions.
 */
export function PosterImage({
  src,
  position,
  sizes,
  priority = false,
}: {
  src: string;
  position?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      quality={85}
      className="object-cover"
      style={{ objectPosition: position }}
    />
  );
}
