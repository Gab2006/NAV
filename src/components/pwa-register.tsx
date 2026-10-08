"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("Service Worker registrato con successo."))
        .catch((err) => console.log("Errore registrazione Service Worker:", err));
    }
  }, []);

  return null;
}
