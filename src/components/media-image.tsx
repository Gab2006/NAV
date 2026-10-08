"use client";

import { MediaType } from "@/types/media";
import { Film, ImageOff, Tv } from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";

interface MediaImageProps {
  src?: string | null;
  alt: string;
  title?: string;
  mediaType?: MediaType;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
}

export function MediaImage({
  src,
  alt,
  title,
  mediaType = "movie",
  fill = true,
  width,
  height,
  className = "object-cover",
  sizes,
  priority = false,
  loading = "lazy",
}: MediaImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const displayTitle = title || alt;
  const isBrokenOrMissing = !src || hasError;
  const effectiveSizes =
    sizes ||
    (fill
      ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      : undefined);

  if (isBrokenOrMissing) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-3 select-none overflow-hidden bg-gradient-to-b from-[#222222] via-[#181818] to-[#101010] border border-white/5 text-center">
        {/* Subtle red ambient glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-[#E50914]/20 blur-2xl pointer-events-none" />

        {/* Media Icon Badge */}
        <div className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-neutral-800/80 border border-white/10 flex items-center justify-center mb-2 shadow-lg text-neutral-400 group-hover:text-[#E50914] transition-colors">
          {mediaType === "tv" ? (
            <Tv className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <Film className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </div>

        {/* Tag */}
        <span className="relative z-10 text-[9px] font-black uppercase tracking-wider text-[#E50914] mb-1">
          {mediaType === "tv" ? "SERIE TV" : "FILM"}
        </span>

        {/* Title */}
        <p className="relative z-10 text-xs sm:text-sm font-bold text-neutral-200 line-clamp-2 px-1 leading-snug">
          {displayTitle}
        </p>

        {/* Placeholder tag */}
        <div className="relative z-10 mt-2 flex items-center gap-1 text-[9px] text-neutral-500 font-medium">
          <ImageOff className="w-3 h-3" />
          <span>Locandina non disp.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Loading Skeleton Shimmer */}
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-800 animate-pulse z-0" />
      )}

      {/* Optimized Image with Lazy Loading */}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        priority={priority}
        loading={priority ? undefined : loading}
        decoding="async"
        sizes={effectiveSizes}
        className={`${className} transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}
