type ShotProps = {
  base: string;
  alt: string;
  w: number;
  h: number;
  sizes?: string;
  className?: string;
  eager?: boolean;
};

export function Shot({
  base,
  alt,
  w,
  h,
  sizes = '(max-width: 760px) 92vw, 45vw',
  className = '',
  eager = false,
}: ShotProps) {
  return (
    <picture className={className}>
      <source
        type="image/avif"
        srcSet={`/screenshots/${base}-800.avif 800w, /screenshots/${base}-1600.avif 1600w`}
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet={`/screenshots/${base}-800.webp 800w, /screenshots/${base}-1600.webp 1600w`}
        sizes={sizes}
      />
      <img
        src={`/screenshots/${base}-1600.webp`}
        alt={alt}
        width={w}
        height={h}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    </picture>
  );
}
