"use client";

import { useMediaModal } from "@/context/media-modal-context";
import { getImageUrl, TmdbImageSize } from "@/lib/tmdb";
import { MediaItem } from "@/types/media";
import { Check, ChevronDown, Download, Loader2, Play, Star } from "lucide-react";
import React, { useState } from "react";
import { MediaImage } from "./media-image";

interface MediaCardProps {
  media: MediaItem;
  isLarge?: boolean;
  className?: string;
  imageSize?: TmdbImageSize;
}

export function MediaCard({
  media,
  isLarge = false,
  className = "",
  imageSize,
}: MediaCardProps) {
  const { openModal } = useMediaModal();
  const [downloading, setDownloading] = useState(false);
  const [downloadQueued, setDownloadQueued] = useState(false);
  const imagePath = isLarge
    ? media.posterPath || media.backdropPath
    : media.backdropPath || media.posterPath;
  const defaultSize: TmdbImageSize = isLarge ? "w342" : "w300";
  const imageUrl = getImageUrl(imagePath, imageSize || defaultSize);

  const releaseYear = media.releaseDate
    ? new Date(media.releaseDate).getFullYear()
    : "";

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const year = parseInt(
        ((media as any).release_date || media.releaseDate || (media as any).first_air_date || "2024").slice(0, 4)
      );

      const res = await fetch("/api/media/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: media.id,
          title: media.title || (media as any).name,
          year: isNaN(year) ? 2024 : year,
          type: media.mediaType || (media.title ? "movie" : "tv"),
        }),
      });
      if (res.ok) {
        setDownloadQueued(true);
        alert("Richiesta inviata! Ricerca e download avviati sul server.");
      } else {
        const errData = await res.json().catch(() => ({}));
        const rawErr = errData?.error;
        const msg = typeof rawErr === "string" ? rawErr : (rawErr?.errorMessage || rawErr?.message || (rawErr ? JSON.stringify(rawErr) : "Errore durante l'avvio del download."));
        alert(msg);
      }
    } catch (err) {
      console.error(err);
      alert("Errore durante l'avvio del download.");
    } finally {
      setDownloading(false);
    }
  };

  const sizeClasses = className
    ? className
    : isLarge
    ? "w-[150px] sm:w-[190px] md:w-[220px] aspect-[2/3] flex-none"
    : "w-[240px] sm:w-[280px] md:w-[320px] aspect-[16/9] flex-none";

  return (
    <div
      onClick={() => openModal(media)}
      className={`group/card relative cursor-pointer select-none rounded-2xl transition-transform duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:z-10 hover:shadow-[0_12px_36px_rgba(0,0,0,0.6)] ${sizeClasses}`}
    >
      {/* Media Image Container */}
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#14151a] border border-white/10 group-hover/card:border-white/20 transition-colors">
        <MediaImage
          src={imageUrl}
          alt={media.title}
          title={media.title}
          mediaType={media.mediaType}
          fill
          loading="lazy"
          sizes={
            isLarge
              ? "(max-width: 640px) 160px, (max-width: 1024px) 220px, 300px"
              : "(max-width: 640px) 240px, (max-width: 1024px) 280px, 320px"
          }
          className="object-cover transition-transform duration-500 group-hover/card:scale-105"
        />

        {/* Gradient shadow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10]/95 via-transparent to-transparent opacity-90 group-hover/card:opacity-100 transition-opacity" />

        {/* Title overlay at bottom for standard view */}
        <div className="absolute bottom-2.5 left-3 right-3">
          <p className="text-white font-semibold text-xs sm:text-sm truncate">
            {media.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-xs text-neutral-400">
            <span className="flex items-center text-amber-300 font-medium gap-1">
              <Star className="w-3 h-3 fill-current text-amber-400" />
              {media.voteAverage.toFixed(1)}
            </span>
            {releaseYear && <span>• {releaseYear}</span>}
          </div>
        </div>

        {/* Minimal Quick Action Overlay (Reveals on Hover - CSS only, no JS) */}
        <div className="absolute inset-0 bg-[#0c0d10]/85 p-3.5 sm:p-4 flex flex-col justify-between transition-opacity duration-200 opacity-0 pointer-events-none group-hover/card:opacity-100 group-hover/card:pointer-events-auto">
          {/* Top Row: Minimal Pills */}
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase rounded-full bg-white/10 border border-white/10 text-neutral-300">
              {media.mediaType === "tv" ? "Serie" : "Film"}
            </span>
            {releaseYear && (
              <span className="text-[10px] sm:text-[11px] text-neutral-400 font-medium">
                {releaseYear}
              </span>
            )}
          </div>

          {/* Center: Title and Brief Summary */}
          <div className="text-center my-auto px-1">
            <h4 className="text-white font-semibold text-xs sm:text-sm md:text-base line-clamp-2">
              {media.title}
            </h4>
            <p className="text-[10px] sm:text-xs text-neutral-400 line-clamp-2 sm:line-clamp-3 mt-1 sm:mt-1.5 leading-snug">
              {media.overview}
            </p>
          </div>

          {/* Bottom Row: Frosted Glass Pill Actions */}
          <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-white/10">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Play / Trailer button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(media);
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-all active:scale-90 shadow"
                title="Riproduci trailer"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </button>

              {/* NAS Download Trigger */}
              <button
                onClick={handleDownloadClick}
                disabled={downloading}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                  downloadQueued
                    ? "bg-emerald-600/90 border-emerald-500 text-white"
                    : "bg-white/10 border-white/15 text-white hover:bg-[#E50914] hover:border-[#E50914]"
                }`}
                title={downloadQueued ? "In download su NAS" : "Scarica sul NAS"}
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : downloadQueued ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Modal Detail Expand */}
            <button
              onClick={() => openModal(media)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
              title="Dettagli completi"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
