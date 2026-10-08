"use client";

import { FloatingNav } from "@/components/floating-nav";
import { HeroBanner } from "@/components/hero-banner";
import { MediaCard } from "@/components/media-card";
import { MediaRow } from "@/components/media-row";
import { SearchResponse } from "@/lib/tmdb";
import { MediaDetail, MediaItem } from "@/types/media";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Film, HardDrive, Loader2, Search, Server, Tv, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface HomeViewProps {
  heroItem: MediaDetail | MediaItem;
  trending: MediaItem[];
  movies: MediaItem[];
  tvShows: MediaItem[];
  newReleases: MediaItem[];
  topRated: MediaItem[];
  nasLibrary?: MediaItem[];
}

export function HomeView({
  heroItem,
  trending,
  movies,
  tvShows,
  newReleases,
  topRated,
  nasLibrary = [],
}: HomeViewProps) {
  const [activeCategory, setActiveCategory] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<"movie" | "tv" | null>(null);

  // Debounce search query to avoid spamming the TMDb API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Determine type filter for search if selected
  const searchType =
    activeCategory === "movie" ? "movie" : activeCategory === "tv" ? "tv" : "all";

  // Live TMDb multi-page search query via React Query
  const {
    data: searchData,
    fetchNextPage: fetchNextSearchPage,
    hasNextPage: hasNextSearchPage,
    isFetchingNextPage: isFetchingNextSearchPage,
    isLoading: isSearching,
  } = useInfiniteQuery<SearchResponse>({
    queryKey: ["media-search", debouncedQuery, searchType],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(
        `/api/media/search?query=${encodeURIComponent(
          debouncedQuery
        )}&page=${pageParam}&type=${searchType}`
      );
      if (!res.ok) throw new Error("Search request failed");
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: debouncedQuery.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const isSearchActive = searchQuery.trim().length > 0;

  // Flattened array of all search pages with deduplication
  const liveSearchResults = useMemo(() => {
    if (!searchData) return [];
    const seen = new Set<string>();
    return searchData.pages
      .flatMap((page) => page.results || [])
      .filter((item) => {
        const key = `${item.mediaType || "media"}-${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [searchData]);

  const totalLiveResults =
    searchData?.pages[0]?.totalResults ?? liveSearchResults.length;

  // Dynamic API fetching for browsing categories (Film, Serie TV, Nuovi & Popolari, NAS)
  const isDynamicCategory =
    !isSearchActive &&
    (activeCategory === "movie" ||
      activeCategory === "tv" ||
      activeCategory === "popular" ||
      activeCategory === "nas");

  const {
    data: categoryData,
    fetchNextPage: fetchNextCategoryPage,
    hasNextPage: hasNextCategoryPage,
    isFetchingNextPage: isFetchingNextCategoryPage,
    isLoading: isCategoryLoading,
  } = useInfiniteQuery<SearchResponse>({
    queryKey: ["media-category-api", activeCategory],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(
        `/api/media?category=${activeCategory}&page=${pageParam}`
      );
      if (!res.ok) throw new Error("Category fetch failed");
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: isDynamicCategory,
    staleTime: 1000 * 60 * 5,
  });


  // Flattened array of category results with deduplication
  const liveCategoryResults = useMemo(() => {
    if (activeCategory === "nas") {
      const fromQuery = categoryData?.pages
        ?.flatMap((page) => page.results || []);
      if (fromQuery && fromQuery.length > 0) {
        const seen = new Set<string>();
        return fromQuery.filter((item) => {
          const key = `${item.mediaType || "media"}-${item.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      return nasLibrary;
    }
    if (!categoryData) return [];
    const seen = new Set<string>();
    return categoryData.pages
      .flatMap((page) => page.results || [])
      .filter((item) => {
        const key = `${item.mediaType || "media"}-${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [categoryData, activeCategory, nasLibrary]);

  // Titoli della libreria NAS filtrati (solo contenuti scaricati, e filtrati per Film / Serie TV se selezionato)
  const nasFilteredItems = useMemo(() => {
    const downloadedOnly = liveCategoryResults.filter(
      (item) => item.downloadStatus === "available" || item.downloadProgress === 100
    );
    if (!libraryFilter) return downloadedOnly;
    return downloadedOnly.filter((item) => item.mediaType === libraryFilter);
  }, [liveCategoryResults, libraryFilter]);

  const totalCategoryResults =
    activeCategory === "nas"
      ? nasFilteredItems.length
      : categoryData?.pages[0]?.totalResults ?? liveCategoryResults.length;

  const isBrowsingGrid = isSearchActive || activeCategory !== "home";

  const currentItems = useMemo(() => {
    if (isSearchActive) return liveSearchResults;
    if (activeCategory === "nas") return nasFilteredItems;
    if (isDynamicCategory) return liveCategoryResults;
    return [];
  }, [isSearchActive, liveSearchResults, activeCategory, nasFilteredItems, isDynamicCategory, liveCategoryResults]);

  const isCurrentLoading = isSearchActive
    ? isSearching && liveSearchResults.length === 0
    : activeCategory === "nas"
    ? isCategoryLoading && liveCategoryResults.length === 0
    : isDynamicCategory
    ? isCategoryLoading && liveCategoryResults.length === 0
    : false;

  const hasMore = isSearchActive
    ? hasNextSearchPage
    : activeCategory === "nas"
    ? false
    : isDynamicCategory
    ? hasNextCategoryPage
    : false;

  const isFetchingMore = isSearchActive
    ? isFetchingNextSearchPage
    : isDynamicCategory
    ? isFetchingNextCategoryPage
    : false;

  const fetchNext = isSearchActive
    ? fetchNextSearchPage
    : fetchNextCategoryPage;

  // Infinite Scroll Sentinel IntersectionObserver (anticipa il caricamento a 600px dal fondo)
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (!node || !hasMore) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
            fetchNext();
          }
        },
        {
          rootMargin: "600px",
          threshold: 0,
        }
      );

      observerRef.current.observe(node);
    },
    [hasMore, isFetchingMore, fetchNext]
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#f2f2f5] flex flex-col selection:bg-[#E50914] selection:text-white relative">
      {/* Top Search Bar (in alto nella home, senza sfondo e senza scritta) */}
      <div className="relative z-40 w-full px-4 sm:px-6 lg:px-8 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-3 bg-transparent pointer-events-none">
        <div className="max-w-xl mx-auto w-full pointer-events-auto">
          <div className="relative flex items-center w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within:text-white pointer-events-none z-10 transition-colors" />
            <input
              type="text"
              placeholder="Cerca film o serie TV..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 hover:bg-black/70 focus:bg-black/90 backdrop-blur-2xl text-xs sm:text-sm text-white placeholder-neutral-400 rounded-full pl-11 pr-10 py-2.5 border border-white/20 hover:border-white/30 focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] focus:outline-none transition-all duration-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.35)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Cancella ricerca"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <main className="flex-1 pb-32">
        <AnimatePresence mode="wait" initial={false}>
          {!isBrowsingGrid ? (
            <motion.div
              key="view-home-billboard"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Cinematic Hero Billboard */}
              <div className="-mt-[70px] sm:-mt-[76px]">
                <HeroBanner media={heroItem} />
              </div>

              {/* Content Rows Section */}
              <div className="relative -mt-14 sm:-mt-20 md:-mt-28 z-30 space-y-3 sm:space-y-6">
                <MediaRow
                  title="Di Tendenza"
                  items={trending}
                  isLarge={true}
                />
                <MediaRow
                  title="Film in Primo Piano"
                  items={movies}
                />
                <MediaRow
                  title="Serie TV del Momento"
                  items={tvShows}
                />
                <MediaRow
                  title="Nuove Uscite"
                  items={newReleases}
                />
                <MediaRow
                  title="I Più Votati"
                  items={topRated}
                />
                {nasLibrary.length > 0 && (
                  <MediaRow
                    title="Disponibili sul tuo NAS"
                    items={nasLibrary}
                    isLarge={false}
                  />
                )}
              </div>
            </motion.div>
          ) : (
            /* Grid View for Filter / Search / My List / Dynamic DB Categories */
            <motion.div
              key={`view-${activeCategory}-${isSearchActive ? 'search' : 'category'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="pt-6 sm:pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      {isSearchActive
                        ? `Risultati per "${searchQuery}"`
                        : activeCategory === "tv"
                        ? "Serie TV"
                        : activeCategory === "movie"
                        ? "Film in Primo Piano"
                        : activeCategory === "popular"
                        ? "Nuovi & Popolari"
                        : activeCategory === "nas"
                        ? "Libreria"
                        : activeCategory === "search"
                        ? "Cerca nel Catalogo"
                        : "Esplora Catalogo"}
                    </h1>

                    {activeCategory === "nas" && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/10 font-medium">
                        {nasFilteredItems.length} {nasFilteredItems.length === 1 ? "titolo" : "titoli"}
                      </span>
                    )}

                    {((isSearchActive && isSearching && liveSearchResults.length === 0) ||
                      (isDynamicCategory && isCategoryLoading && liveCategoryResults.length === 0)) && (
                      <span className="text-xs px-3 py-1 rounded-full bg-red-950/40 text-red-400 border border-red-800/30 flex items-center gap-1.5 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Caricamento dal database...</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1.5">
                    {isSearchActive
                      ? "Risultati in tempo reale dal database multimediale."
                      : activeCategory === "nas"
                      ? "Film e serie TV scaricati e disponibili per la visione sul NAS."
                      : "Catalogo dinamico sincronizzato via API direttamente dal database."}
                  </p>
                </div>

                {/* Filtri Libreria NAS: solo due bottoni (Film e Serie TV) */}
                {activeCategory === "nas" ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setLibraryFilter((prev) => (prev === "movie" ? null : "movie"))
                      }
                      aria-pressed={libraryFilter === "movie"}
                      className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 active:scale-95 ${
                        libraryFilter === "movie"
                          ? "bg-[#E50914] text-white shadow-[0_2px_12px_rgba(229,9,20,0.35)] border border-[#E50914]"
                          : "bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Film</span>
                    </button>

                    <button
                      onClick={() =>
                        setLibraryFilter((prev) => (prev === "tv" ? null : "tv"))
                      }
                      aria-pressed={libraryFilter === "tv"}
                      className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 active:scale-95 ${
                        libraryFilter === "tv"
                          ? "bg-[#E50914] text-white shadow-[0_2px_12px_rgba(229,9,20,0.35)] border border-[#E50914]"
                          : "bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span>Serie TV</span>
                    </button>
                  </div>
                ) : isSearchActive ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSearchQuery("")}
                      className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancella</span>
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Grid display logic */}
              {(() => {
                if (isCurrentLoading) {
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6 pt-2">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-full aspect-[2/3] rounded-2xl bg-white/5 animate-pulse border border-white/5"
                        />
                      ))}
                    </div>
                  );
                }

                if (currentItems.length === 0) {
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="text-center py-24 space-y-4"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
                        <Search className="w-7 h-7 opacity-70" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-neutral-200">
                        {isSearchActive
                          ? "Nessun risultato trovato"
                          : activeCategory === "nas"
                          ? libraryFilter === "movie"
                            ? "Nessun film scaricato sul NAS"
                            : libraryFilter === "tv"
                            ? "Nessuna serie TV scaricata sul NAS"
                            : "Nessun titolo scaricato nel NAS"
                          : "Nessun elemento trovato"}
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                        {isSearchActive
                          ? `Non abbiamo trovato corrispondenze per "${searchQuery}".`
                          : activeCategory === "nas"
                          ? libraryFilter === "movie"
                            ? "I film completati e scaricati tramite Radarr appariranno qui."
                            : libraryFilter === "tv"
                            ? "Le serie TV con episodi scaricati tramite Sonarr appariranno qui."
                            : "I contenuti scaricati e disponibili sul tuo server personale appariranno qui."
                          : "Non ci sono titoli disponibili per questa categoria al momento."}
                      </p>
                      {activeCategory === "nas" && libraryFilter !== null ? (
                        <button
                          onClick={() => setLibraryFilter(null)}
                          className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-medium transition-all active:scale-95"
                        >
                          Mostra tutti i titoli scaricati
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveCategory("home");
                            setSearchQuery("");
                          }}
                          className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-medium transition-all active:scale-95"
                        >
                          Torna alla Home
                        </button>
                      )}
                    </motion.div>
                  );
                }

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6 pt-2 animate-[fadeIn_0.25s_ease-out]">
                      {currentItems.map((item) => (
                        <MediaCard
                          key={`${item.mediaType}-${item.id}`}
                          media={item}
                          isLarge={true}
                          className="w-full aspect-[2/3]"
                        />
                      ))}
                    </div>

                    {/* Infinite Scroll Sentinel & Loading Indicator */}
                    {hasMore && (
                      <div
                        ref={loadMoreSentinelRef}
                        className="flex justify-center items-center py-8 min-h-[72px]"
                      >
                        {isFetchingMore && (
                          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg animate-in fade-in duration-200">
                            <Loader2 className="w-4 h-4 animate-spin text-[#E50914]" />
                            <span className="text-xs text-neutral-400 font-medium tracking-wide">
                              Caricamento altri titoli...
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Progressive Bottom Blur Mask (stile VersePal) */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bottom-blur-gradient pointer-events-none z-40" />

      {/* Floating Navigation Pill Bar */}
      <FloatingNav
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          setSearchQuery("");
          if (cat !== "nas") {
            setLibraryFilter(null);
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
