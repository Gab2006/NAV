"use client";

import { useMediaModal } from "@/context/media-modal-context";
import { getImageUrl, getMediaDetails } from "@/lib/tmdb";
import { DownloadStatus, IndexerLookupResult, MediaDetail, MediaItem, NasDiskSpace } from "@/types/media";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Download,
  HardDrive,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Server,
  Star,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { MediaImage } from "./media-image";

export function MediaDetailModal() {
  const { selectedMedia, isOpen, closeModal } = useMediaModal();
  const [showTrailer, setShowTrailer] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>("unrequested");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isRequestingDownload, setIsRequestingDownload] = useState(false);
  const [diskSpace, setDiskSpace] = useState<NasDiskSpace | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Indexer lookup state
  const [indexerResult, setIndexerResult] = useState<IndexerLookupResult | null>(null);
  const [isCheckingIndexers, setIsCheckingIndexers] = useState(false);

  // Preserve media data during exit animation so content doesn't abruptly unmount
  const [cachedMedia, setCachedMedia] = useState<MediaDetail | MediaItem | null>(null);

  useEffect(() => {
    if (selectedMedia) {
      setCachedMedia(selectedMedia);
      setIndexerResult(null);
    }
  }, [selectedMedia]);

  const activeMedia = selectedMedia || cachedMedia;

  const handleClose = () => {
    closeModal();
  };

  const handleExitComplete = () => {
    setShowTrailer(false);
    setShowDeleteConfirm(false);
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when modal is open to avoid background page bleeding/scrolling
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const mediaId = activeMedia?.id;
  const mediaType = activeMedia?.mediaType || "movie";

  // 1. Fetch details con React Query caching (15 min cache)
  const { data: fetchedDetails, isLoading: isLoadingDetails } = useQuery<MediaDetail | null>({
    queryKey: ["media-details", mediaId, mediaType],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/media/details?id=${mediaId}&type=${mediaType}`);
        if (res.ok) return await res.json();
      } catch {}
      return getMediaDetails(mediaId!, mediaType);
    },
    enabled: Boolean(isOpen && mediaId),
    staleTime: 1000 * 60 * 15,
  });

  const details = fetchedDetails || null;

  // 2. Fetch live NAS download status & storage con React Query
  const { data: statusQueryData, isFetching: isCheckingStatusQuery } = useQuery({
    queryKey: ["media-status", mediaId, mediaType],
    queryFn: async () => {
      const res = await fetch(`/api/media/status?tmdbId=${mediaId}&type=${mediaType}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: Boolean(isOpen && mediaId),
    staleTime: 1000 * 15,
  });

  const isCheckingStatus = isCheckingStatusQuery;

  useEffect(() => {
    if (statusQueryData) {
      if (statusQueryData.status) {
        setDownloadStatus(statusQueryData.status);
        setDownloadProgress(statusQueryData.progress || 0);
      }
      if (statusQueryData.diskSpace) {
        setDiskSpace(statusQueryData.diskSpace);
      }
    }
  }, [statusQueryData]);

  const currentMedia = fetchedDetails || details || activeMedia;
  const backdropUrl = currentMedia
    ? getImageUrl(
        currentMedia.backdropPath || currentMedia.posterPath,
        "w1280"
      )
    : "";
  const releaseYear = currentMedia?.releaseDate
    ? new Date(currentMedia.releaseDate).getFullYear()
    : "2024";

  const isDownloadUnavailable =
    indexerResult !== null
      ? !indexerResult.available
      : downloadStatus === "missing" || downloadStatus === "not_available";

  const handleStartDownload = async () => {
    if (!activeMedia || isDownloadUnavailable) return;
    setIsRequestingDownload(true);
    try {
      const year = parseInt(
        ((activeMedia as any).release_date || activeMedia.releaseDate || (activeMedia as any).first_air_date || "2024").slice(0, 4)
      );

      const res = await fetch("/api/media/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: activeMedia.id,
          title: activeMedia.title || (activeMedia as any).name,
          year: isNaN(year) ? 2024 : year,
          type: activeMedia.mediaType || (activeMedia.title ? "movie" : "tv"),
        }),
      });

      if (res.ok) {
        setDownloadStatus("downloading");
        setDownloadProgress(25);
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
      setIsRequestingDownload(false);
    }
  };

  const handleCheckIndexers = async () => {
    if (!activeMedia) return;
    setIsCheckingIndexers(true);
    setIndexerResult(null);
    try {
      const title = activeMedia.title || (activeMedia as any).name || "";
      const year = (activeMedia.releaseDate || (activeMedia as any).first_air_date || "2024").slice(0, 4);
      const type = activeMedia.mediaType || "movie";
      const params = new URLSearchParams({ title, year, type, tmdbId: String(activeMedia.id) });
      const res = await fetch(`/api/media/indexer-lookup?${params}`);
      const data: IndexerLookupResult = await res.json();
      setIndexerResult(data);
    } catch {
      setIndexerResult({ available: false, count: 0, releases: [], nasConfigured: false, error: "Errore di rete" });
    } finally {
      setIsCheckingIndexers(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeMedia) return;
    setIsDeleting(true);

    try {
      const res = await fetch("/api/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: activeMedia.id,
          mediaType: activeMedia.mediaType || "movie",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowDeleteConfirm(false);
        setDownloadStatus("unrequested");
        setDownloadProgress(0);
        // Aggiorna lo spazio disco NAS in tempo reale
        fetch("/api/media/diskspace")
          .then((r) => r.json())
          .then((ds) => {
            if (ds && !ds.error) setDiskSpace(ds);
          })
          .catch(() => {});
        // Notifica l'applicazione che i media NAS sono cambiati
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("nas-media-updated"));
        }
        alert("Titolo e file eliminati con successo dal NAS.");
      } else {
        alert(data.error || "Errore durante l'eliminazione dal NAS.");
      }
    } catch (err) {
      console.error("Errore cancellazione NAS:", err);
      alert("Errore di connessione durante l'eliminazione dal NAS.");
    } finally {
      setIsDeleting(false);
    }
  };

  const TOTAL_DISK_SEGMENTS = 20;
  const percentUsed = diskSpace ? diskSpace.percentUsed : 65;
  const percentFree = Math.max(0, Math.min(100, 100 - percentUsed));
  const usedSegments = diskSpace
    ? (diskSpace.rawUsedBytes || 0) > 0 && Math.round((percentUsed / 100) * TOTAL_DISK_SEGMENTS) === 0
      ? 1
      : Math.min(TOTAL_DISK_SEGMENTS, Math.round((percentUsed / 100) * TOTAL_DISK_SEGMENTS))
    : Math.round((65 / 100) * TOTAL_DISK_SEGMENTS);

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isOpen && activeMedia && currentMedia && (
        <motion.div
          key="modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="fixed inset-0 z-[60] flex items-start justify-center p-0 sm:p-4 md:p-6 overflow-y-auto overscroll-contain bg-[#0c0d10]"
        >
          {/* Click-to-close overlay */}
          <div
            className="fixed inset-0"
            onClick={handleClose}
            aria-hidden="true"
          />


          {/* Modal Dialog Card with smooth spring scale/slide transition */}
          <motion.div
            key="modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{
              duration: 0.28,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative w-full sm:max-w-4xl min-h-[100dvh] sm:min-h-0 bg-[#131418] sm:bg-[#131418]/95 backdrop-blur-2xl rounded-none sm:rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] overflow-hidden border-0 sm:border border-white/10 z-10 my-0 sm:my-auto will-change-transform flex flex-col"
          >
            {/* Floating Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-[calc(1rem+env(safe-area-inset-top,0px))] sm:top-4 right-4 z-40 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-xl text-white flex items-center justify-center transition-all active:scale-95 border border-white/15 shadow-md"
              aria-label="Chiudi finestra"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Top Media Hero / Trailer Banner */}
            <div className="relative w-full h-72 sm:h-80 md:h-96 bg-neutral-950 overflow-hidden flex-shrink-0">
              <AnimatePresence mode="wait">
                {showTrailer && details?.trailerKey ? (
                  <motion.div
                    key="modal-trailer-video"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full h-full"
                  >
                    <iframe
                      src={`https://www.youtube.com/embed/${details.trailerKey}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`}
                      title={`${currentMedia.title} Trailer`}
                      className="w-full h-full border-0 bg-black"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                    <a
                      href={`https://www.youtube.com/watch?v=${details.trailerKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-[#E50914] text-white text-[11px] font-medium backdrop-blur-md border border-white/20 transition-all shadow-lg active:scale-95"
                      title="Apri direttamente su YouTube"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Apri su YouTube</span>
                    </a>
                  </motion.div>
                ) : (
                  <motion.div
                    key="modal-trailer-poster"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full h-full"
                  >
                    <MediaImage
                      src={backdropUrl}
                      alt={currentMedia.title}
                      title={currentMedia.title}
                      mediaType={currentMedia.mediaType}
                      fill
                      priority
                      sizes="(max-width: 896px) 100vw, 896px"
                      className="object-cover object-center filter brightness-[0.85]"
                    />
                    {/* Top gradient for status bar readability on mobile */}
                    <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none z-10" />
                    {/* Bottom gradient fade into modal body */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131418] via-[#131418]/50 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#131418]/90 via-[#131418]/30 to-transparent w-3/4" />

                    {/* Title & Actions inside banner */}
                    <div className="absolute bottom-6 left-6 right-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#E50914] text-white rounded-full">
                          {currentMedia.mediaType === "tv" ? "Serie TV" : "Film"}
                        </span>
                        {details?.tagline && (
                          <span className="text-xs text-neutral-300 italic hidden sm:inline opacity-80">
                            &quot;{details.tagline}&quot;
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                        {currentMedia.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {/* Trailer Trigger */}
                        <button
                          onClick={() => {
                            if (!details?.trailerKey) return;
                            setShowTrailer(true);
                          }}
                          disabled={isLoadingDetails || !details?.trailerKey}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-100 transition-all active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isLoadingDetails ? (
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                          ) : (
                            <Play className="w-4 h-4 fill-current" />
                          )}
                          <span>
                            {isLoadingDetails
                              ? "Caricamento trailer..."
                              : !details?.trailerKey
                              ? "Trailer non disponibile"
                              : "Guarda Trailer"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-8 space-y-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] sm:pb-8 flex-1">
          {/* Metadata Row in Pill Formats */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300 pb-4 border-b border-white/10">
            <span className="text-amber-300 font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
              {currentMedia.voteAverage.toFixed(1)}
            </span>
            <span className="flex items-center gap-1.5 text-neutral-300 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              {releaseYear}
            </span>
            {details?.runtime && (
              <span className="flex items-center gap-1.5 text-neutral-300 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
              </span>
            )}
            {details?.numberOfSeasons && (
              <span className="flex items-center gap-1.5 text-neutral-300 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                <Tv className="w-3.5 h-3.5 text-neutral-400" />
                {details.numberOfSeasons} {details.numberOfSeasons === 1 ? "Stagione" : "Stagioni"}
              </span>
            )}
          </div>

          {/* Main Grid: Overview & NAS Action Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Left 2 Cols: Synopsis & Cast – on mobile renders AFTER the NAS panel */}
            <div className="md:col-span-2 space-y-6 order-last md:order-first">
              <div>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Sinossi
                </h3>
                <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed opacity-95">
                  {currentMedia.overview}
                </p>
              </div>

              {/* Cast */}
              {details?.cast && details.cast.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Cast Principale
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {details.cast.slice(0, 4).map((actor) => (
                      <div
                        key={actor.id}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/5"
                      >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                          {actor.profilePath ? (
                            <Image
                              src={getImageUrl(actor.profilePath, "w185")}
                              alt={actor.name}
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-400">
                              {actor.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {actor.name}
                          </p>
                          <p className="text-[10px] text-neutral-400 truncate">
                            {actor.character}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Col: NAS Download & Server Hub – on mobile renders FIRST */}
            <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md order-first md:order-last">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Server className="w-4 h-4 text-[#E50914]" />
                  <span>Controllo NAS</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">
                  {currentMedia.mediaType === "movie" ? "Film" : "Serie TV"}
                </span>
              </div>



              {/* Spazio Memoria NAS (Dashed Segmented Bar) */}
              <div className="w-full p-3 sm:p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-2.5 overflow-hidden">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-neutral-300 font-medium text-[11px] min-w-0">
                    <HardDrive className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">Memoria NAS</span>
                    {diskSpace && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none shrink-0 ${
                          diskSpace.isReal
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-white/5 text-neutral-400 border border-white/10"
                        }`}
                      >
                        {diskSpace.isReal ? "Live" : "Offline"}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-medium shrink-0">
                    {percentFree}% libera
                  </span>
                </div>

                {/* Barra tratteggiata a segmenti (Dashed segments) */}
                <div
                  className="w-full flex items-center gap-1 py-0.5"
                  title={`Liberi: ${diskSpace?.free || "1.4 TB"} (${percentFree}%) • Occupati: ${diskSpace?.used || "2.6 TB"} (${percentUsed}%)`}
                >
                  {Array.from({ length: TOTAL_DISK_SEGMENTS }).map((_, index) => {
                    const isOccupied = index < usedSegments;
                    return (
                      <div
                        key={index}
                        className={`h-2 flex-1 min-w-0 rounded-[2px] transition-all duration-300 ${
                          isOccupied
                            ? percentUsed > 85
                              ? "bg-[#E50914] shadow-[0_0_6px_rgba(229,9,20,0.5)]"
                              : percentUsed > 60
                              ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                              : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.3)]"
                            : "bg-emerald-500/80 shadow-[0_0_4px_rgba(16,185,129,0.25)] hover:bg-emerald-400"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Legend: Memoria Occupata e Libera */}
                <div className="flex items-center justify-between text-[10px] pt-0.5 gap-2 text-neutral-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="truncate">Occupati:</span>
                    <span className="text-white font-medium font-mono shrink-0">
                      {diskSpace?.used || "2.6 TB"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="truncate">Liberi:</span>
                    <span className="text-emerald-400 font-semibold font-mono shrink-0">
                      {diskSpace?.free || "1.4 TB"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stato sintetico NAS – solo icona + testo, niente box */}
              {downloadStatus !== "unrequested" && (
                <div className="flex justify-end">
                  {downloadStatus === "available" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 whitespace-nowrap">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      Disponibile su NAS
                    </span>
                  ) : downloadStatus === "downloading" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 whitespace-nowrap">
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      In download ({downloadProgress}%)
                    </span>
                  ) : downloadStatus === "queued" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      In coda di download
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Non disponibile
                    </span>
                  )}
                </div>
              )}

              {/* Action Row: Verifica disponibilità & Download circolare */}
              <div className="space-y-2">
                {downloadStatus === "available" ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                      <Check className="w-4 h-4" />
                      <span>Presente nella cartella</span>
                    </div>

                    {/* Bottone rotondo Cestino per eliminare dal NAS */}
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting}
                      title="Elimina dal NAS"
                      aria-label="Elimina dal NAS"
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : isCheckingStatus ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-xs font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifica disponibilità...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Tasto Verifica disponibilità */}
                    <button
                      onClick={handleCheckIndexers}
                      disabled={isCheckingIndexers}
                      className="flex-1 py-2.5 px-4 rounded-full font-semibold text-xs bg-white/8 hover:bg-white/12 disabled:opacity-50 text-neutral-200 border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      {isCheckingIndexers ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Ricerca release...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5 text-neutral-300" />
                          <span>Verifica disponibilità</span>
                        </>
                      )}
                    </button>

                    {/* Tasto Download circolare compatto */}
                    <button
                      onClick={handleStartDownload}
                      disabled={
                        isRequestingDownload ||
                        isCheckingIndexers ||
                        downloadStatus === "downloading" ||
                        downloadStatus === "queued" ||
                        isDownloadUnavailable
                      }
                      title={
                        downloadStatus === "downloading"
                          ? "Download in corso"
                          : downloadStatus === "queued"
                          ? "In attesa di download"
                          : isDownloadUnavailable
                          ? "Nessun file disponibile per il download"
                          : "Scarica"
                      }
                      aria-label="Scarica"
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all border ${
                        downloadStatus === "downloading"
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : downloadStatus === "queued"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : isDownloadUnavailable
                          ? "bg-white/5 text-neutral-600 border-white/10 cursor-not-allowed opacity-40 shadow-none"
                          : "bg-[#E50914] hover:bg-[#f21823] text-white border-transparent shadow-[0_0_12px_rgba(229,9,20,0.35)] active:scale-95 disabled:opacity-50"
                      }`}
                    >
                      {isRequestingDownload ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : downloadStatus === "downloading" ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                      ) : downloadStatus === "queued" ? (
                        <RefreshCw className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>

                    {/* Bottone elimina anche per contenuti già tracciati su Radarr/Sonarr */}
                    {downloadStatus !== "unrequested" && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isDeleting}
                        title="Rimuovi dal NAS"
                        aria-label="Rimuovi dal NAS"
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Avanzamento download se attivo */}
                {downloadStatus === "downloading" && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>Avanzamento download</span>
                      <span className="text-white font-mono">{downloadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Esito disponibilità compatto (senza elenco release) */}
                {indexerResult && downloadStatus !== "available" && (
                  <div
                    className={`rounded-xl border px-3.5 py-2 text-xs flex items-center gap-2 transition-all ${
                      indexerResult.error && !indexerResult.nasConfigured
                        ? "border-white/10 bg-white/5 text-neutral-400"
                        : indexerResult.error
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                        : indexerResult.available
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.12)]"
                        : "border-red-500/20 bg-red-500/10 text-red-300"
                    }`}
                  >
                    {!indexerResult.nasConfigured ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>NAS non configurato</span>
                      </>
                    ) : indexerResult.error ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{indexerResult.error}</span>
                      </>
                    ) : indexerResult.available ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-medium">File disponibile per il download</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>Nessun file disponibile per il download</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <p className="text-[10px] text-neutral-500 leading-tight">
                * Il download verrà gestito automaticamente dal tuo server personale.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal di Conferma Eliminazione Titolo & File dal NAS */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[#14151a] border border-white/10 p-5 sm:p-6 shadow-[0_24px_50px_rgba(0,0,0,0.8)] space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-inner">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Eliminare dal NAS?
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Sei sicuro di voler eliminare <span className="text-white font-medium">&quot;{currentMedia.title}&quot;</span>?
                  Il titolo verrà rimosso da {currentMedia.mediaType === "movie" ? "Radarr" : "Sonarr"} e tutti i file video verranno cancellati definitivamente dallo storage del NAS.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-full font-semibold text-xs bg-white/10 hover:bg-white/15 text-neutral-200 border border-white/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-full font-semibold text-xs bg-[#E50914] hover:bg-[#b80710] text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Eliminazione...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Elimina</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
