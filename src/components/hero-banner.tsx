"use client";

import { useMediaModal } from "@/context/media-modal-context";
import { MOCK_HERO } from "@/lib/mock-data";
import { getImageUrl } from "@/lib/tmdb";
import { MediaDetail, MediaItem } from "@/types/media";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Loader2,
  Play,
  Star,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MediaImage } from "./media-image";

interface HeroBannerProps {
  media?: MediaDetail | MediaItem;
  items?: (MediaDetail | MediaItem)[];
}

export function HeroBanner({ media, items }: HeroBannerProps) {
  const { openModal } = useMediaModal();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadSuccessIds, setDownloadSuccessIds] = useState<Set<number>>(new Set());

  const list = useMemo(() => {
    if (items && items.length > 0) return items;
    if (media) return [media];
    return [MOCK_HERO];
  }, [items, media]);

  // Ensure index remains in bounds if list changes
  const activeIndex = Math.min(currentIndex, list.length - 1);
  const currentMedia = list[activeIndex] || MOCK_HERO;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % list.length);
  }, [list.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + list.length) % list.length);
  }, [list.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-rotation every 7 seconds when not hovered and multiple items
  useEffect(() => {
    if (list.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      goToNext();
    }, 7000);
    return () => clearInterval(timer);
  }, [list.length, isHovered, goToNext]);

  // Touch swipe support for mobile devices
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 45) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
    touchStartX.current = null;
  };

  const backdropUrl = getImageUrl(
    currentMedia.backdropPath || currentMedia.posterPath,
    "w1280"
  );

  const releaseYear = currentMedia.releaseDate
    ? new Date(currentMedia.releaseDate).getFullYear()
    : "2024";

  const isDownloading = downloadingId === currentMedia.id;
  const isDownloaded = downloadSuccessIds.has(currentMedia.id);

  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingId(currentMedia.id);

    try {
      const year = parseInt(
        (
          (currentMedia as any).release_date ||
          currentMedia.releaseDate ||
          (currentMedia as any).first_air_date ||
          "2024"
        ).slice(0, 4)
      );

      const res = await fetch("/api/media/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: currentMedia.id,
          title: currentMedia.title || (currentMedia as any).name,
          year: isNaN(year) ? 2024 : year,
          type: currentMedia.mediaType || (currentMedia.title ? "movie" : "tv"),
        }),
      });

      if (res.ok) {
        setDownloadSuccessIds((prev) => new Set(prev).add(currentMedia.id));
        alert("Richiesta inviata! Ricerca e download avviati sul server.");
      } else {
        const errData = await res.json().catch(() => ({}));
        const rawErr = errData?.error;
        const msg =
          typeof rawErr === "string"
            ? rawErr
            : rawErr?.errorMessage ||
              rawErr?.message ||
              (rawErr
                ? JSON.stringify(rawErr)
                : "Errore durante l'avvio del download.");
        alert(msg);
      }
    } catch (err) {
      console.error(err);
      alert("Errore durante l'avvio del download.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div
      className="relative w-full h-[72vh] sm:h-[80vh] lg:h-[86vh] overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Backdrop Image with Crossfade */}
      <div className="absolute inset-0">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`hero-bg-${currentMedia.id}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <MediaImage
              src={backdropUrl}
              alt={currentMedia.title}
              title={currentMedia.title}
              mediaType={currentMedia.mediaType}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center sm:object-top filter brightness-[0.8]"
            />
          </motion.div>
        </AnimatePresence>

        {/* Cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/50 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d10]/95 via-[#0c0d10]/45 to-transparent w-full lg:w-3/4 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0c0d10]/70 to-transparent pointer-events-none" />
      </div>

      {/* Hero Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-24 sm:pb-28 z-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          {/* Main Media Info & Actions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-info-${currentMedia.id}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl space-y-4"
            >
              {/* Metadata Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 text-[11px] font-semibold tracking-wider uppercase bg-[#E50914] text-white rounded-full shadow-sm">
                  {currentMedia.mediaType === "tv" ? "Serie TV" : "Film"}
                </span>
                <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-amber-300">
                  <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                  <span>{currentMedia.voteAverage.toFixed(1)}</span>
                </div>
                <span className="px-3 py-1 text-xs text-neutral-300 font-medium bg-white/5 backdrop-blur-md rounded-full border border-white/5">
                  {releaseYear}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
                {currentMedia.title}
              </h1>

              {/* Synopsis */}
              <p className="text-xs sm:text-sm text-neutral-300 line-clamp-3 sm:line-clamp-4 font-normal leading-relaxed max-w-xl opacity-90">
                {currentMedia.overview}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => openModal(currentMedia)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-100 transition-all active:scale-95 shadow-md"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Trailer</span>
                </button>

                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-xs sm:text-sm transition-all active:scale-95 shadow-md ${
                    isDownloaded
                      ? "bg-emerald-600/90 hover:bg-emerald-600 text-white"
                      : "bg-[#E50914] hover:bg-[#f21823] text-white"
                  }`}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Invio al NAS...</span>
                    </>
                  ) : isDownloaded ? (
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

                <button
                  onClick={() => openModal(currentMedia)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 dark:bg-black/30 hover:bg-white/15 text-white font-medium text-xs sm:text-sm backdrop-blur-2xl border border-white/10 transition-all active:scale-95"
                >
                  <Info className="w-4 h-4 opacity-80" />
                  <span>Dettagli</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Carousel Indicators & Controls */}
          {list.length > 1 && (
            <div className="flex items-center gap-3 self-start md:self-end pt-1 md:pt-0">
              {/* 5 Sleek Indicator Pills */}
              <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
                {list.map((item, idx) => {
                  const isActive = activeIndex === idx;
                  return (
                    <button
                      key={item.id || idx}
                      onClick={() => goToIndex(idx)}
                      title={item.title}
                      aria-label={`Film ${idx + 1}: ${item.title}`}
                      className={`relative h-2 rounded-full transition-all duration-300 ${
                        isActive
                          ? "w-8 sm:w-10 bg-[#E50914] shadow-[0_0_10px_rgba(229,9,20,0.7)]"
                          : "w-2.5 sm:w-3 bg-white/25 hover:bg-white/50"
                      }`}
                    />
                  );
                })}
              </div>

              {/* Prev / Next Chevrons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPrev}
                  aria-label="Film precedente"
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center transition-all active:scale-95 hover:border-white/25"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNext}
                  aria-label="Film successivo"
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center transition-all active:scale-95 hover:border-white/25"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
