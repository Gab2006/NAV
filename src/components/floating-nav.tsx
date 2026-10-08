"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Film,
  Home,
  Library,
  Tv,
} from "lucide-react";
import React from "react";

interface FloatingNavProps {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  isVisible?: boolean;
}

export function FloatingNav({
  activeCategory,
  onSelectCategory,
  isVisible = true,
}: FloatingNavProps) {
  return (
    <AnimatePresence initial={false}>
      {isVisible && (
        <motion.div
          initial={{ y: 140, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 140, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-0 right-0 flex items-center justify-center pointer-events-none z-50 will-change-transform px-4"
        >
          <div className="pointer-events-auto flex items-center justify-center">
            {/* Pillola principale della Floating Nav */}
            <div className="flex items-center justify-center bg-white/10 dark:bg-black/30 bg-gradient-to-b from-white/25 to-white/5 dark:from-white/10 dark:to-transparent backdrop-blur-2xl backdrop-saturate-[1.8] rounded-full px-6 py-3 sm:px-6 sm:py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.25),inset_0_-1px_1px_rgba(255,255,255,0.02)] border border-white/25 dark:border-white/10 transition-all duration-300 gap-6 sm:gap-7">
              {/* Home */}
              <button
                onClick={() => onSelectCategory("home")}
                aria-label="Home"
                title="Home"
                className={`relative p-2.5 rounded-full transition-all active:scale-95 ${
                  activeCategory === "home"
                    ? "text-[#E50914]"
                    : "text-neutral-400 hover:text-white [&>svg]:opacity-70 hover:[&>svg]:opacity-100"
                }`}
              >
                <Home className="w-6 h-6 sm:w-6 sm:h-6" />
                {activeCategory === "home" && (
                  <motion.div
                    layoutId="floatingNavIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#E50914]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>

              {/* Serie TV */}
              <button
                onClick={() => onSelectCategory("tv")}
                aria-label="Serie TV"
                title="Serie TV"
                className={`relative p-2.5 rounded-full transition-all active:scale-95 ${
                  activeCategory === "tv"
                    ? "text-[#E50914]"
                    : "text-neutral-400 hover:text-white [&>svg]:opacity-70 hover:[&>svg]:opacity-100"
                }`}
              >
                <Tv className="w-6 h-6 sm:w-6 sm:h-6" />
                {activeCategory === "tv" && (
                  <motion.div
                    layoutId="floatingNavIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#E50914]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>

              {/* Film */}
              <button
                onClick={() => onSelectCategory("movie")}
                aria-label="Film"
                title="Film"
                className={`relative p-2.5 rounded-full transition-all active:scale-95 ${
                  activeCategory === "movie"
                    ? "text-[#E50914]"
                    : "text-neutral-400 hover:text-white [&>svg]:opacity-70 hover:[&>svg]:opacity-100"
                }`}
              >
                <Film className="w-6 h-6 sm:w-6 sm:h-6" />
                {activeCategory === "movie" && (
                  <motion.div
                    layoutId="floatingNavIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#E50914]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>

              {/* Libreria NAS */}
              <button
                onClick={() => onSelectCategory("nas")}
                aria-label="Libreria NAS"
                title="Libreria NAS"
                className={`relative p-2.5 rounded-full transition-all active:scale-95 ${
                  activeCategory === "nas"
                    ? "text-[#E50914]"
                    : "text-neutral-400 hover:text-white [&>svg]:opacity-70 hover:[&>svg]:opacity-100"
                }`}
              >
                <Library className="w-6 h-6 sm:w-6 sm:h-6" />
                {activeCategory === "nas" && (
                  <motion.div
                    layoutId="floatingNavIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#E50914]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
