"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // 1. Registra il service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registrato con successo."))
        .catch((err) => console.log("Errore registrazione Service Worker:", err));
    }

    // 2. Sistema di Auto-Update tramite polling
    let currentVersion: string | null = null;

    const checkVersion = async () => {
      try {
        // Aggiungiamo un parametro di query random per evitare la cache del browser/proxy
        const res = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        
        if (currentVersion === null) {
          // Memorizza la versione iniziale al caricamento dell'app
          currentVersion = data.version;
        } else if (currentVersion !== data.version) {
          // Se la versione è cambiata rispetto all'inizio, c'è stato un aggiornamento/riavvio
          console.log("Nuova versione trovata, ricaricamento in corso...");
          window.location.reload();
        }
      } catch (err) {
        // Ignoriamo eventuali errori (es. se l'utente è offline)
      }
    };

    // Controlla all'avvio
    checkVersion();

    // Controlla quando l'app torna in primo piano (es. riaperta da background su iOS/Android)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
        
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((reg) => reg.update().catch(() => {}));
        }
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
