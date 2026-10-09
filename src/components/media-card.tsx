"use client";

import { useMediaModal } from "@/context/media-modal-context";
import { getImageUrl, TmdbImageSize } from "@/lib/tmdb";
import { MediaItem } from "@/types/media";
import { Check, ChevronDown, Clock, Download, Loader2, Play, Star } from "lucide-react";
import React, { useState } from "react";
import { MediaImage } from "./media-image";

interface MediaCardProps {
  media: MediaItem;
  isLarge?: boolean;
  className?: string;
  imageSize?: TmdbImageSize;
  hideDownload?: boolean;
}

export function MediaCard({
  media,
  isLarge = false,
  className = "",
  imageSize,
  hideDownload = false,
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

  const isAvailable =
    media.downloadStatus === "available" ||
    (!media.downloadStatus && media.downloadProgress === 100);
  const isActivelyDownloading = media.downloadStatus === "downloading";
  const isQueued = media.downloadStatus === "queued";
  const isMissing = media.downloadStatus === "missing";
  const isNotAvailable = media.downloadStatus === "not_available";
  const isUnmonitored = media.downloadStatus === "unmonitored";

  // Item is on NAS / tracked but not downloaded/available yet
  const isNotDownloaded =
    isActivelyDownloading ||
    isQueued ||
    isMissing ||
    isNotAvailable ||
    isUnmonitored;

  // Don't show redundant download trigger if already available or actively in download
  const isDownloaded =
    hideDownload ||
    isAvailable ||
    isActivelyDownloading ||
    isQueued;

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMissing || isNotAvailable) return;
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
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("nas-media-updated"));
        }
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
          className={`object-cover transition-transform duration-500 group-hover/card:scale-105 ${
            isNotDownloaded ? "grayscale contrast-95 opacity-80" : ""
          }`}
        />

        {/* Gradient shadow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10]/95 via-transparent to-transparent opacity-90 group-hover/card:opacity-100 transition-opacity" />

        {/* Status Badge in top-left corner */}
        {isNotDownloaded && (
          <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-20 pointer-events-none flex items-center gap-1.5 max-w-[calc(100%-16px)]">
            {isActivelyDownloading ? (
              <>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-blue-500/40 text-[8.5px] sm:text-[9.5px] font-semibold text-blue-200 shadow-md whitespace-nowrap">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400 shrink-0" />
                  <span>In download</span>
                </span>
                {typeof media.downloadProgress === "number" && media.downloadProgress > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-blue-500/30 text-[8.5px] sm:text-[9.5px] font-bold text-blue-300 shadow-md whitespace-nowrap">
                    {media.downloadProgress}%
                  </span>
                )}
              </>
            ) : isQueued ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-amber-500/40 text-[8.5px] sm:text-[9.5px] font-semibold text-amber-200 shadow-md whitespace-nowrap">
                <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span>In coda</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[8.5px] sm:text-[9.5px] font-medium text-neutral-200 shadow-md whitespace-nowrap truncate">
                <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span>
                  <span className="hidden sm:inline">Attualmente </span>non disponibile
                </span>
              </span>
            )}
          </div>
        )}

        {/* Active download progress bar */}
        {isActivelyDownloading && (
          <div className="absolute bottom-11 left-3 right-3 z-20 space-y-1 pointer-events-none">
            <div className="flex items-center justify-between text-[9px] font-medium text-neutral-300">
              <span className="text-neutral-400">Download in corso</span>
              <span className="text-blue-300 font-mono">{media.downloadProgress}%</span>
            </div>
            <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(5, media.downloadProgress || 5)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Title overlay at bottom for standard view */}
        <div className="absolute bottom-2.5 left-3 right-3 z-20">
          <p className="text-white font-semibold text-xs sm:text-sm truncate">
            {media.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-xs text-neutral-400">
            {isActivelyDownloading ? (
              <span className="text-blue-400/90 font-medium">Download in corso...</span>
            ) : isQueued ? (
              <span className="text-amber-400/90 font-medium">In coda</span>
            ) : (
              <span className="flex items-center text-amber-300 font-medium gap-1">
                <Star className="w-3 h-3 fill-current text-amber-400" />
                {media.voteAverage.toFixed(1)}
              </span>
            )}
            {releaseYear && <span>• {releaseYear}</span>}
          </div>
        </div>

        {/* Minimal Quick Action Overlay (Reveals on Hover) */}
        <div className="absolute inset-0 bg-[#0c0d10]/90 p-3.5 sm:p-4 flex flex-col justify-between transition-opacity duration-200 opacity-0 pointer-events-none group-hover/card:opacity-100 group-hover/card:pointer-events-auto z-30">
          {/* Top Row: Minimal Pills */}
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase rounded-full bg-white/10 border border-white/10 text-neutral-300">
              {media.mediaType === "tv" ? "Serie" : "Film"}
            </span>
            {isActivelyDownloading ? (
              <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 flex items-center gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                <span>In download</span>
              </span>
            ) : isQueued ? (
              <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                <span>In coda</span>
              </span>
            ) : isNotDownloaded ? (
              <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase rounded-full bg-white/10 border border-white/15 text-neutral-300 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-amber-400" />
                <span>Non disponibile</span>
              </span>
            ) : releaseYear ? (
              <span className="text-[10px] sm:text-[11px] text-neutral-400 font-medium">
                {releaseYear}
              </span>
            ) : null}
          </div>

          {/* Center: Title and Brief Summary */}
          <div className="text-center my-auto px-1">
            <h4 className="text-white font-semibold text-xs sm:text-sm md:text-base line-clamp-2">
              {media.title}
            </h4>
            <p className="text-[10px] sm:text-xs text-neutral-400 line-clamp-2 sm:line-clamp-3 mt-1 sm:mt-1.5 leading-snug">
              {isActivelyDownloading
                ? "Il contenuto è attualmente in fase di download sul server NAS."
                : isQueued
                ? "In coda di download sul server NAS."
                : isNotDownloaded
                ? "Contenuto attualmente non disponibile per la riproduzione sul server NAS."
                : media.overview}
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
              {!isDownloaded && (
                <button
                  onClick={handleDownloadClick}
                  disabled={downloading || isMissing || isNotAvailable}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all ${
                    downloadQueued
                      ? "bg-emerald-600/90 border-emerald-500 text-white"
                      : isMissing || isNotAvailable
                      ? "bg-white/5 border-white/10 text-neutral-600 cursor-not-allowed opacity-40 shadow-none"
                      : "bg-white/10 border-white/15 text-white hover:bg-[#E50914] hover:border-[#E50914] active:scale-90"
                  }`}
                  title={
                    downloadQueued
                      ? "In download su NAS"
                      : isMissing || isNotAvailable
                      ? "Nessun file disponibile per il download"
                      : "Scarica"
                  }
                >
                  {downloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : downloadQueued ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
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
