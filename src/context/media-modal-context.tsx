"use client";

import { MediaDetail, MediaItem } from "@/types/media";
import React, { createContext, useContext, useState } from "react";

interface MediaModalContextType {
  selectedMedia: MediaItem | MediaDetail | null;
  isOpen: boolean;
  openModal: (media: MediaItem | MediaDetail) => void;
  closeModal: () => void;
}

const MediaModalContext = createContext<MediaModalContextType | undefined>(undefined);

export function MediaModalProvider({ children }: { children: React.ReactNode }) {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | MediaDetail | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openModal = (media: MediaItem | MediaDetail) => {
    setSelectedMedia(media);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedMedia(null);
  };

  return (
    <MediaModalContext.Provider
      value={{
        selectedMedia,
        isOpen,
        openModal,
        closeModal,
      }}
    >
      {children}
    </MediaModalContext.Provider>
  );
}

export function useMediaModal() {
  const context = useContext(MediaModalContext);
  if (!context) {
    throw new Error("useMediaModal must be used within a MediaModalProvider");
  }
  return context;
}
