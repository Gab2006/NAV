"use client";

import { MediaItem } from "@/types/media";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useRef } from "react";
import { MediaCard } from "./media-card";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  isLarge?: boolean;
  hideDownload?: boolean;
  priorityCount?: number;
}

function MediaRowComponent({
  title,
  items,
  isLarge = false,
  hideDownload = false,
  priorityCount = 0,
}: MediaRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = rowRef.current;
      const scrollOffset = clientWidth * 0.75;
      let scrollTo: number;

      if (direction === "left") {
        if (scrollLeft <= 20) {
          // Se siamo all'inizio, naviga verso la fine del carosello
          scrollTo = scrollWidth - clientWidth;
        } else {
          scrollTo = Math.max(0, scrollLeft - scrollOffset);
        }
      } else {
        if (scrollLeft + clientWidth >= scrollWidth - 20) {
          // Se siamo alla fine, ritorna all'inizio del carosello
          scrollTo = 0;
        } else {
          scrollTo = Math.min(scrollWidth - clientWidth, scrollLeft + scrollOffset);
        }
      }

      rowRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2 md:space-y-3 my-6 sm:my-8 relative group">
      {/* Row Header */}
      <div className="flex items-baseline justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-100 hover:text-white transition-colors cursor-pointer flex items-center gap-2 group/title">
            <span>{title}</span>
            <ChevronRight className="w-4 h-4 text-[#E50914] opacity-0 group-hover/title:opacity-100 transition-opacity transform group-hover/title:translate-x-1" />
          </h2>
        </div>
        <span className="text-xs text-neutral-400 hidden sm:inline">
          {items.length} titoli
        </span>
      </div>

      {/* Carousel Container with Always-Visible Floating Glass Buttons Layered on Top (z-50) */}
      <div className="relative group/carousel">
        {/* Left Gradient Edge Vignette */}
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-r from-[#0c0d10]/90 to-transparent z-30 pointer-events-none rounded-l-2xl" />

        {/* Right Gradient Edge Vignette */}
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-[#0c0d10]/90 to-transparent z-30 pointer-events-none rounded-r-2xl" />

        {/* Scrollable Items Track */}
        <div
          ref={rowRef}
          className="carousel-track flex items-center gap-3 sm:gap-4 overflow-x-auto hide-scrollbar px-4 sm:px-6 lg:px-8 py-3"
        >
          {items.map((item, index) => (
            <MediaCard
              key={`${item.mediaType || "media"}-${item.id}`}
              media={item}
              isLarge={isLarge}
              hideDownload={hideDownload}
              priority={priorityCount > 0 && index < priorityCount}
              loading={priorityCount > 0 && index < priorityCount ? "eager" : "lazy"}
            />
          ))}
        </div>

        {/* Left Scroll Button - hidden on mobile (touch native), visible on desktop */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleScroll("left");
          }}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-[#131418]/90 hover:bg-[#E50914] backdrop-blur-xl border border-white/20 text-white items-center justify-center transition-all duration-200 shadow-[0_8px_24px_rgba(0,0,0,0.8)] opacity-90 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto"
          aria-label="Scorri indietro"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Right Scroll Button - hidden on mobile (touch native), visible on desktop */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleScroll("right");
          }}
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-[#131418]/90 hover:bg-[#E50914] backdrop-blur-xl border border-white/20 text-white items-center justify-center transition-all duration-200 shadow-[0_8px_24px_rgba(0,0,0,0.8)] opacity-90 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto"
          aria-label="Scorri avanti"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

export const MediaRow = React.memo(MediaRowComponent);
