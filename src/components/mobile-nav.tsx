"use client";

import { Film, Home, Library, Tv } from "lucide-react";
import React from "react";

interface MobileNavProps {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export function MobileNav({
  activeCategory,
  onSelectCategory,
}: MobileNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-white/10 px-2 py-2 flex items-center justify-around">
      <button
        onClick={() => onSelectCategory("home")}
        className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
          activeCategory === "home" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
        }`}
      >
        <Home className={`w-5 h-5 ${activeCategory === "home" ? "text-[#E50914]" : ""}`} />
        <span className="text-[10px] font-medium">Home</span>
      </button>

      <button
        onClick={() => onSelectCategory("tv")}
        className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
          activeCategory === "tv" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
        }`}
      >
        <Tv className={`w-5 h-5 ${activeCategory === "tv" ? "text-[#E50914]" : ""}`} />
        <span className="text-[10px] font-medium">Serie TV</span>
      </button>

      <button
        onClick={() => onSelectCategory("movie")}
        className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
          activeCategory === "movie" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
        }`}
      >
        <Film className={`w-5 h-5 ${activeCategory === "movie" ? "text-[#E50914]" : ""}`} />
        <span className="text-[10px] font-medium">Film</span>
      </button>

      <button
        onClick={() => onSelectCategory("nas")}
        className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
          activeCategory === "nas" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
        }`}
      >
        <Library className={`w-5 h-5 ${activeCategory === "nas" ? "text-[#E50914]" : ""}`} />
        <span className="text-[10px] font-medium">Libreria</span>
      </button>
    </nav>
  );
}
