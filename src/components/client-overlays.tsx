"use client";

import dynamic from "next/dynamic";

const MediaDetailModal = dynamic(
  () => import("@/components/media-detail-modal").then((mod) => mod.MediaDetailModal),
  { ssr: false }
);

const PwaRegister = dynamic(
  () => import("@/components/pwa-register").then((mod) => mod.PwaRegister),
  { ssr: false }
);

export function ClientOverlays() {
  return (
    <>
      <MediaDetailModal />
      <PwaRegister />
    </>
  );
}
