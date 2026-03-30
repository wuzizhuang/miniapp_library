import Image, { ImageProps } from "next/image";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

type BaseImageProps = Omit<ImageProps, "alt" | "src" | "fill">;

export interface AppImageProps extends BaseImageProps {
  alt: string;
  src?: string | null;
  fallbackSrc?: string;
  fill?: boolean;
  wrapperClassName?: string;
}

const DEFAULT_FALLBACK_SRC = "/images/book-placeholder.svg";

export function AppImage({
  alt,
  className,
  fallbackSrc = DEFAULT_FALLBACK_SRC,
  fill = false,
  height,
  sizes,
  src,
  width,
  wrapperClassName,
  ...rest
}: AppImageProps) {
  const resolvedSrc = useMemo(() => {
    const normalized = typeof src === "string" ? src.trim() : "";

    return normalized || fallbackSrc;
  }, [fallbackSrc, src]);
  const [currentSrc, setCurrentSrc] = useState(resolvedSrc);

  useEffect(() => {
    setCurrentSrc(resolvedSrc);
  }, [resolvedSrc]);

  return (
    <div
      className={clsx(
        "relative overflow-hidden bg-default-100",
        wrapperClassName,
      )}
    >
      <Image
        alt={alt}
        className={clsx("object-cover", className)}
        fill={fill}
        height={!fill ? (height ?? 600) : undefined}
        sizes={fill ? (sizes ?? "100vw") : sizes}
        src={currentSrc}
        unoptimized
        width={!fill ? (width ?? 400) : undefined}
        onError={() => {
          if (currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
          }
        }}
        {...rest}
      />
    </div>
  );
}
