# NetStream • Linee Guida di Progetto & Regole di Sviluppo

## 1. Regole Tassative per l'Assistente AI (Chat & Interazione)
- **DIVIETO ASSOLUTO DI CODICE IN CHAT**: Non mostrare **MAI E POI MAI** blocchi di codice scritto, modificato o intere porzioni di file all'interno dei messaggi di risposta nella chat. Modifica e crea direttamente i file sul filesystem tramite gli appositi strumenti.
- **MASSIMA SINTESI**: Rispondi sempre in modo estremamente conciso, sintetico e diretto al punto, senza preamboli, riepiloghi prolissi o spiegazioni ridondanti del codice generato.
- **LINK AI FILE**: Cita i file toccati o creati esclusivamente tramite link markdown con schema `file://` (es. [NomeFile](file:///path/to/file)).

---

## 2. Panoramica del Progetto & Architettura
- **Identità**: **NetStream** – Frontend cinematografico stile Netflix / VersePal per l'esplorazione multimediale e la gestione automatica dei download su NAS personale (Radarr e Sonarr) tramite API TMDb.
- **Framework**: Next.js 16 (App Router) con React 19 e TypeScript.
- **Server & Network**:
  - Dev server configurato per rete locale (`0.0.0.0:3000` con `allowedDevOrigins` in `next.config.ts`).
  - Ottimizzazione PWA (`manifest.json`, Service Worker, safe-area-inset per dispositivi mobile/iOS).
- **Gestione Stato & Fetching**:
  - TanStack React Query (`@tanstack/react-query`) per ricerca multi-pagina, cache e chiamate client.
  - React Context (`MediaModalContext`) per lo stato del modal dei dettagli e la gestione di "La mia lista".
  - Chiamate Server Side (`HomePage` con fetch parallele tramite `Promise.all` e revalidate TMDb).
- **Integrazioni Esterne**:
  - **TMDb**: Locandine, sfondi, trailer YouTube, cast, sinossi e valutazioni.
  - **Radarr (Porta 7878)**: Gestione download film.
  - **Sonarr (Porta 8989)**: Gestione ricerca e download serie TV.

---

## 3. Design System & Stile Visivo

### Palette Colori
- **Sfondo Principale**: `#0c0d10` (Nero profondo cinematografico)
- **Superfici & Card**:
  - Base: `#131418` / `#14151a`
  - Card Elevata: `#1a1b22`
  - Hover Surface: `#23252e`
- **Brand / Accent**:
  - Rosso Netflix: `#E50914`
  - Rosso Hover: `#f21823`
  - Red Glow: `rgba(229, 9, 20, 0.8)` o `rgba(229, 9, 20, 0.2)` per luci ambientali
- **Testi**:
  - Primario: `#f2f2f5`
  - Secondario / Muted: `#8b8c96` / `#82838d`
  - Chiaro Contrasto: `#c2c3cb`
- **Stati & Indicatori**:
  - Server Online: Emerald (`#10b981` / `bg-emerald-500`)
  - Rating & Stelle: Amber (`text-amber-400` / `fill-current`)
- **Bordi**: `rgba(255, 255, 255, 0.08)` fino a `rgba(255, 255, 255, 0.15)`

### Tipografia & Testi
- **Font**: Geist (`--font-geist-sans`) e Geist Mono (`--font-geist-mono`) tramite `next/font/google`.
- **Gerarchia**:
  - Titoli sezioni: `text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-neutral-100`.
  - Micro-badge e pillole: `text-[9px]` a `text-[11px]`, font `semibold` o `black`, `uppercase`, `tracking-wider`.
  - Dettagli secondari: `text-xs` o `text-sm`, `text-neutral-400`.

### Stili Glassmorphism & Effetti
- **Pillole Fluttuanti & Navbar**:
  - `backdrop-blur-2xl backdrop-saturate-[1.8] bg-white/10 dark:bg-black/30`
  - Bordi con riflesso: `border border-white/25 dark:border-white/10`
  - Ombreggiature profonde: `shadow-[0_12px_40px_rgba(0,0,0,0.45)]`
- **Sfumature Progressive**:
  - Gradienti neri verso il basso e l'alto con maschera blur (`.bottom-blur-gradient`).
  - Overlay per le immagini hero: gradiente radiale/lineare per garantire la leggibilità del testo.
- **Scrollbar**:
  - Scrollbar globale ultra-sottile (6px) con thumb semitrasparente.
  - Caroselli orizzontali: classe `.hide-scrollbar` con frecce floating a comparsa su hover.

---

## 4. Pattern dei Componenti & Linee Guida UI
- **Pulsanti**:
  - Forma pillola (`rounded-full`), effetto click `active:scale-95` o `active:scale-[0.98]`.
  - Disabilitare `-webkit-tap-highlight-color`.
- **Card Multimediali (`MediaCard`)**:
  - Formato poster: aspect ratio `2/3` (`isLarge`).
  - Formato backdrop standard: aspect ratio `16/9`.
  - Bordi arrotondati `rounded-2xl`, overflow nascosto.
  - Transizioni fluide su hover (`hover:scale-[1.02]`, incremento z-index e shadow).
- **Gestione Immagini (`MediaImage`)**:
  - Sempre avvolgere immagini TMDb/esterne con fallback elegante contro link corrotti o locandine mancanti.
  - Skeleton shimmer animato durante il caricamento (`animate-pulse`).
- **Navigazione (`FloatingNav` & `Navbar`)**:
  - Dock inferiore fisso con indicatore attivo animato tramite Framer Motion (`layoutId="floatingNavIndicator"`).
  - Rispettare i margini sicuri per mobile (`env(safe-area-inset-bottom)`).
- **Modal Dettagli (`MediaDetailModal`)**:
  - Blocco dello scroll del body all'apertura (`overflow: hidden`).
  - Riproduzione trailer in iframe YouTube embed.
  - Visualizzazione stato live del download su NAS e switch qualità.

---

## 5. Convenzioni Tecniche & Best Practices
- **Tailwind CSS v4**: Utilizzo dei token definiti in `@theme` in [globals.css](file:///c:/Users/Gabriele%20Tosti/Desktop/NAV/src/app/globals.css).
- **Class Merging**: Usare sempre la funzione helper `cn(...)` definita in [utils.ts](file:///c:/Users/Gabriele%20Tosti/Desktop/NAV/src/lib/utils.ts) per combinare classi condizionali.
- **Icone**: Usare rigorosamente icone da `lucide-react`.
- **API Routes**:
  - Collocate sotto `src/app/api/media/*`.
  - Gestire sempre risposte JSON uniformi `{ error: string }` o dati con corretti status HTTP.
  - Gestione fallback a mock data quando il NAS non è raggiungibile o le variabili d'ambiente non sono configurate.
- **Mobile First & Touch**: Tutti i componenti devono garantire un'esperienza touch eccellente, senza scroll orizzontale anomalo della pagina (`overflow-x: hidden`).
