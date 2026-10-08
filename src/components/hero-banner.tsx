"use client";

import { useMediaModal } from "@/context/media-modal-context";
import { getImageUrl } from "@/lib/tmdb";
import { MediaDetail, MediaItem } from "@/types/media";
import { motion } from "framer-motion";
import { Check, Download, Info, Loader2, Play, Star } from "lucide-react";
import React, { useState } from "react";
import { MediaImage } from "./media-image";

interface HeroBannerProps {
  media: MediaDetail | MediaItem;
}

export function HeroBanner({ media }: HeroBannerProps) {
  const { openModal } = useMediaModal();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const backdropUrl = getImageUrl(media.backdropPath || media.posterPath, "w1280");

  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsDownloading(true);

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
        setDownloadSuccess(true);
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
      setIsDownloading(false);
    }
  };

  const releaseYear = media.releaseDate
    ? new Date(media.releaseDate).getFullYear()
    : "2024";

  return (
    <div className="relative w-full h-[70vh] sm:h-[80vh] lg:h-[85vh] overflow-hidden select-none">
      {/* Background Backdrop Image */}
      <div className="absolute inset-0">
        <MediaImage
          src={backdropUrl}
          alt={media.title}
          title={media.title}
          mediaType={media.mediaType}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center sm:object-top filter brightness-[0.8]"
        />

        {/* Smooth, elegant gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d10]/90 via-[#0c0d10]/40 to-transparent w-full lg:w-3/4" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0c0d10]/70 to-transparent" />
      </div>

      {/* Hero Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-24 sm:pb-28 z-20">
        <div className="max-w-2xl space-y-4">
          {/* Metadata Badges in Minimal Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 text-[11px] font-semibold tracking-wider uppercase bg-[#E50914]/90 text-white rounded-full shadow-sm">
              {media.mediaType === "tv" ? "Serie TV" : "Film"}
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-white/10 dark:bg-black/30 backdrop-blur-xl rounded-full border border-white/10 text-amber-300">
              <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
              <span>{media.voteAverage.toFixed(1)}</span>
            </div>
            <span className="px-3 py-1 text-xs text-neutral-300 font-medium bg-white/5 backdrop-blur-md rounded-full border border-white/5">
              {releaseYear}
            </span>
          </div>

          {/* Grand Title with clean typography */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            {media.title}
          </h1>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm text-neutral-300 line-clamp-3 sm:line-clamp-4 font-normal leading-relaxed max-w-xl opacity-90">
            {media.overview}
          </p>

          {/* Action Buttons in VersePal Floating Pill Style */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            {/* Play Trailer Button */}
            <button
              onClick={() => openModal(media)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-100 transition-all active:scale-95 shadow-md"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Trailer</span>
            </button>

            {/* NAS Download Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-xs sm:text-sm transition-all active:scale-95 shadow-md ${
                downloadSuccess
                  ? "bg-emerald-600/90 hover:bg-emerald-600 text-white"
                  : "bg-[#E50914] hover:bg-[#b80710] text-white"
              }`}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Invio al NAS...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>In coda sul NAS</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Scarica su NAS</span>
                </>
              )}
            </button>

            {/* More Info Button (Frosted glass pill) */}
            <button
              onClick={() => openModal(media)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 dark:bg-black/30 hover:bg-white/15 text-white font-medium text-xs sm:text-sm backdrop-blur-2xl border border-white/10 transition-all active:scale-95"
            >
              <Info className="w-4 h-4 opacity-80" />
              <span>Dettagli</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
