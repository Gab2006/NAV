import { IndexerLookupResult, IndexerRelease } from "@/types/media";
import { NextRequest, NextResponse } from "next/server";

/** Parole comuni da ignorare nel confronto titoli */
const STOP_WORDS = new Set([
  "the", "a", "an", "of", "in", "on", "at", "to", "for", "and", "or", "is", "it",
  "il", "lo", "la", "i", "gli", "le", "di", "da", "in", "con", "su", "per", "tra", "fra",
  "un", "una", "del", "della", "dei", "delle", "degli",
]);

/**
 * Riconosce release registrate al cinema (CAM/TS) o copie bootleg/non conformi
 * che Radarr e Sonarr rifiutano categoricamente per profili di qualità.
 */
function isBootlegOrCam(title: string): boolean {
  if (!title) return false;
  const t = title.toLowerCase();

  const camPatterns = [
    /\b(cam|camrip|hdcam|cam-rip)\b/i,
    /\b(ts|telesync|hdts|hd-ts|pdvd)\b/i,
    /\b(tc|telecine|hdtc)\b/i,
    /\b(dvdscr|scr|screener)\b/i,
    /\b(workprint|wp)\b/i,
    /\b(r5|r6)\b/i,
    /\b(hcsubs|hc-subs|subbed-cam)\b/i,
    /\b(imax-hcsubs|imax-cam)\b/i,
  ];

  for (const pattern of camPatterns) {
    if (pattern.test(t)) return true;
  }

  // Audio da sala cinematografica (Microfono Diretto / Linea Diretta)
  if (/\b(md|ld)\b/i.test(t) && !/\b(web|bluray|bdrip)\b/i.test(t)) {
    return true;
  }

  // File parodia, making of, featurette o sample non scaricabili
  if (/\b(not the|making of|featurette|trailer|sample)\b/i.test(t)) {
    return true;
  }

  return false;
}

/** Formatta una data ISO in formato leggibile italiano (GG/MM/AAAA) */
function formatDateItalian(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Verifica la presenza di traccia audio o sottotitoli in italiano nel titolo,
 * in piena conformità al Custom Format "Audio Italiano" (score >= 1000) configurato su Radarr/Sonarr.
 */
function hasItalianAudio(title: string, indexer?: string): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  return /\b(ita|italian|italiano|sub[\s._-]*ita)\b/i.test(t);
}

/**
 * Verifica che il titolo del release contenga parole significative del titolo cercato.
 */
function titleMatches(releaseTitle: string, searchTitle: string, year?: string | null): boolean {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  const searchWords = normalize(searchTitle);
  const releaseWords = normalize(releaseTitle);

  if (searchWords.length === 0) return true;

  const required = searchWords.length <= 2 ? 1 : Math.ceil(searchWords.length * 0.4);

  let matched = 0;
  for (const word of searchWords) {
    if (releaseWords.some((rw) => rw === word || rw.startsWith(word) || word.startsWith(rw))) {
      matched++;
    }
  }

  return matched >= required;
}

/**
 * Verifica la corrispondenza del release con il titolo italiano o il titolo originale,
 * e verifica la plausibilità dell'anno se presente.
 */
function matchesMedia(
  releaseTitle: string,
  searchTitle: string,
  originalTitle?: string | null,
  year?: string | null
): boolean {
  const matchTitle = titleMatches(releaseTitle, searchTitle, year);
  const matchOriginal = originalTitle ? titleMatches(releaseTitle, originalTitle, year) : false;

  if (!matchTitle && !matchOriginal) return false;

  if (year) {
    const yearNum = parseInt(year, 10);
    if (!isNaN(yearNum)) {
      const releaseYears = (releaseTitle.match(/\b(19\d\d|20\d\d)\b/g) || []).map((y) =>
        parseInt(y, 10)
      );
      if (releaseYears.length > 0 && !releaseYears.some((y) => Math.abs(y - yearNum) <= 1)) {
        return false;
      }
    }
  }

  return true;
}

function isDownloadable(r: any): boolean {
  if (!r || !r.title) return false;
  if (isBootlegOrCam(r.title)) return false;

  const protocol = (r.protocol ?? "").toLowerCase();
  if (protocol === "usenet") return true;

  const seeders = r.seeders ?? r.seedCount ?? null;
  if (protocol === "torrent") return seeders !== null && seeders > 0;
  return seeders !== null && seeders > 0;
}

function parseReleases(
  raw: any[],
  searchTitle?: string,
  originalTitle?: string | null,
  year?: string | null
): IndexerRelease[] {
  return raw
    .filter((r) => {
      if (!r || !r.title) return false;
      if (!isDownloadable(r)) return false;
      if (!hasItalianAudio(r.title, r.indexer)) return false;
      if (searchTitle && !matchesMedia(r.title, searchTitle, originalTitle, year)) return false;
      return true;
    })
    .map((r) => {
      const qualityMatch = r.title.match(
        /\b(2160p|4k|1080p|720p|bluray|bdrip|web-?dl|dvdrip|hdtv)\b/i
      );
      return {
        guid: r.guid || r.downloadUrl || r.magnetUrl || r.infoUrl || r.title,
        title: r.title,
        indexer:
          r.indexer ||
          (Array.isArray(r.indexerFlags) ? r.indexerFlags[0] : r.indexerFlags) ||
          "Indexer",
        size: r.size || 0,
        seeders: r.seeders ?? undefined,
        leechers: r.leechers ?? undefined,
        quality:
          r.quality?.quality?.name ||
          r.quality?.name ||
          r.qualityName ||
          (qualityMatch ? qualityMatch[0].toUpperCase() : "HD"),
        age:
          r.ageMinutes != null
            ? Math.floor(r.ageMinutes / 1440)
            : r.age ?? undefined,
      };
    })
    .sort((a, b) => (b.seeders ?? 0) - (a.seeders ?? 0));
}

async function nasGet(
  baseUrl: string,
  apiKey: string,
  path: string,
  timeoutMs = 8000
): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { "X-Api-Key": apiKey },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = res.ok ? await res.json().catch(() => null) : null;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const originalTitle = searchParams.get("originalTitle");
  const year = searchParams.get("year");
  const tmdbId = searchParams.get("tmdbId");
  const type = searchParams.get("type") || "movie";

  if (!title) {
    return NextResponse.json(
      { error: "Parametro 'title' richiesto" },
      { status: 400 }
    );
  }

  const isMovie = type === "movie";
  const prowlarrUrl = process.env.PROWLARR_URL;
  const prowlarrApiKey = process.env.PROWLARR_API_KEY;

  const targetUrl = isMovie ? process.env.RADARR_URL : process.env.SONARR_URL;
  const apiKey = isMovie
    ? process.env.RADARR_API_KEY
    : process.env.SONARR_API_KEY;

  const nasConfigured = !!(prowlarrUrl && prowlarrApiKey) || !!(targetUrl && apiKey);

  const result: IndexerLookupResult = {
    available: false,
    count: 0,
    releases: [],
    nasConfigured,
  };

  if (!nasConfigured) {
    result.error = "NAS non configurato";
    return NextResponse.json(result);
  }

  const cleanTitle = title.replace(/[:\/]/g, " ").trim();
  const cleanOriginalTitle = originalTitle ? originalTitle.replace(/[:\/]/g, " ").trim() : "";

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // FASE 1: VERIFICA RADARR (PER FILM)
    // ══════════════════════════════════════════════════════════════════════════
    if (isMovie && targetUrl && apiKey) {
      if (tmdbId) {
        const libRes = await nasGet(targetUrl, apiKey, `/api/v3/movie?tmdbId=${tmdbId}`, 4000);
        const movies = Array.isArray(libRes.data)
          ? libRes.data
          : libRes.data
          ? [libRes.data]
          : [];
        const movie = movies[0];

        if (movie && movie.id) {
          // File già scaricato su disco
          if (movie.hasFile || (typeof movie.movieFileId === "number" && movie.movieFileId > 0)) {
            result.available = true;
            result.count = 1;
            result.mediaStatus = "available";
            result.reason = "File già presente nella libreria del tuo NAS.";
            return NextResponse.json(result);
          }

          // In coda di download
          const queueRes = await nasGet(targetUrl, apiKey, `/api/v3/queue?movieId=${movie.id}`, 3000);
          if (queueRes.ok && queueRes.data) {
            const records = queueRes.data.records || (Array.isArray(queueRes.data) ? queueRes.data : []);
            if (records.some((r: any) => r.movieId === movie.id)) {
              result.available = true;
              result.count = 1;
              result.mediaStatus = "downloading";
              result.reason = "Download già in corso sul NAS.";
              return NextResponse.json(result);
            }
          }

          // Ricerca release valutate da Radarr con i profili utente
          const relRes = await nasGet(targetUrl, apiKey, `/api/v3/release?movieId=${movie.id}`, 8000);
          if (relRes.ok && Array.isArray(relRes.data)) {
            const approved = relRes.data.filter(
              (r: any) =>
                r.approved === true &&
                (!r.rejections || r.rejections.length === 0) &&
                r.downloadAllowed !== false &&
                !isBootlegOrCam(r.title) &&
                isDownloadable(r) &&
                hasItalianAudio(r.title, r.indexer)
            );

            if (approved.length > 0) {
              const parsed = parseReleases(approved, cleanTitle, cleanOriginalTitle, year);
              if (parsed.length > 0) {
                result.available = true;
                result.count = parsed.length;
                result.releases = parsed;
                result.mediaStatus = "released";
                return NextResponse.json(result);
              }
            }
          }

          // Se Radarr non ha trovato release approvate, verifichiamo lo stato cinematografico
          if (movie.status === "inCinemas" || !movie.isAvailable) {
            const dateStr = formatDateItalian(movie.digitalRelease || movie.physicalRelease);
            const reason = dateStr
              ? `Film attualmente solo nei cinema (uscita digitale: ${dateStr})`
              : "Film attualmente solo nei cinema (nessun rilascio digitale ancora disponibile)";
            result.available = false;
            result.mediaStatus = "inCinemas";
            result.error = reason;
            result.reason = reason;
            result.releaseDate = movie.digitalRelease || undefined;
            return NextResponse.json(result);
          }

          if (movie.status === "announced" || movie.status === "tba") {
            const reason = "Film annunciato non ancora distribuito nelle sale o in digitale";
            result.available = false;
            result.mediaStatus = "announced";
            result.error = reason;
            result.reason = reason;
            return NextResponse.json(result);
          }
        }
      }

      // Se non presente in libreria, consultiamo il catalogo Radarr (lookup)
      const lookupPath = tmdbId
        ? `/api/v3/movie/lookup/tmdb?tmdbId=${tmdbId}`
        : `/api/v3/movie/lookup?term=${encodeURIComponent(year ? `${cleanTitle} ${year}` : cleanTitle)}`;
      const lookupRes = await nasGet(targetUrl, apiKey, lookupPath, 6000);

      const lookupMovie = Array.isArray(lookupRes.data) ? lookupRes.data[0] : lookupRes.data;
      if (lookupMovie) {
        if (lookupMovie.status === "announced" || lookupMovie.status === "tba") {
          const reason = "Film annunciato non ancora distribuito nelle sale o in digitale";
          result.available = false;
          result.mediaStatus = "announced";
          result.error = reason;
          result.reason = reason;
          return NextResponse.json(result);
        }

        if (lookupMovie.status === "inCinemas") {
          const now = new Date();
          const digitalDate = lookupMovie.digitalRelease ? new Date(lookupMovie.digitalRelease) : null;
          const physicalDate = lookupMovie.physicalRelease ? new Date(lookupMovie.physicalRelease) : null;
          const isReleased = (digitalDate && digitalDate <= now) || (physicalDate && physicalDate <= now);

          if (!isReleased) {
            const dateStr = formatDateItalian(lookupMovie.digitalRelease || lookupMovie.physicalRelease);
            const reason = dateStr
              ? `Film attualmente solo nei cinema (uscita digitale: ${dateStr})`
              : "Film attualmente solo nei cinema (nessun rilascio digitale ancora disponibile)";
            result.available = false;
            result.mediaStatus = "inCinemas";
            result.error = reason;
            result.reason = reason;
            result.releaseDate = lookupMovie.digitalRelease || undefined;
            return NextResponse.json(result);
          }
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FASE 2: VERIFICA SONARR (PER SERIE TV)
    // ══════════════════════════════════════════════════════════════════════════
    if (!isMovie && targetUrl && apiKey) {
      if (tmdbId) {
        const libRes = await nasGet(targetUrl, apiKey, `/api/v3/series?tmdbId=${tmdbId}`, 4000);
        const seriesList = Array.isArray(libRes.data)
          ? libRes.data
          : libRes.data
          ? [libRes.data]
          : [];
        const series = seriesList[0];

        if (series && series.id) {
          const epFiles = series.statistics?.episodeFileCount ?? series.episodeFileCount ?? 0;
          if (epFiles > 0) {
            result.available = true;
            result.count = epFiles;
            result.mediaStatus = "available";
            result.reason = "Episodi già presenti nella libreria del tuo NAS.";
            return NextResponse.json(result);
          }

          if (series.status === "upcoming") {
            const reason = "Serie TV annunciata non ancora trasmessa";
            result.available = false;
            result.mediaStatus = "upcoming";
            result.error = reason;
            result.reason = reason;
            return NextResponse.json(result);
          }

          // Cerca release valutate da Sonarr
          const relRes = await nasGet(targetUrl, apiKey, `/api/v3/release?seriesId=${series.id}`, 8000);
          if (relRes.ok && Array.isArray(relRes.data)) {
            const approved = relRes.data.filter(
              (r: any) =>
                r.approved === true &&
                (!r.rejections || r.rejections.length === 0) &&
                r.downloadAllowed !== false &&
                !isBootlegOrCam(r.title) &&
                isDownloadable(r) &&
                hasItalianAudio(r.title, r.indexer)
            );
            if (approved.length > 0) {
              const parsed = parseReleases(approved, cleanTitle, cleanOriginalTitle, year);
              if (parsed.length > 0) {
                result.available = true;
                result.count = parsed.length;
                result.releases = parsed;
                result.mediaStatus = "released";
                return NextResponse.json(result);
              }
            }
          }
        }
      }

      // Consultazione Sonarr lookup
      const term = tmdbId ? `tmdb:${tmdbId}` : cleanTitle;
      const lookupRes = await nasGet(
        targetUrl,
        apiKey,
        `/api/v3/series/lookup?term=${encodeURIComponent(term)}`,
        6000
      );
      const lookupSeries = Array.isArray(lookupRes.data) ? lookupRes.data[0] : lookupRes.data;

      if (lookupSeries) {
        const now = new Date();
        const firstAired = lookupSeries.firstAired ? new Date(lookupSeries.firstAired) : null;
        if (lookupSeries.status === "upcoming" || (firstAired && firstAired > now)) {
          const dateStr = formatDateItalian(lookupSeries.firstAired);
          const reason = dateStr
            ? `Serie TV non ancora trasmessa (debutto previsto: ${dateStr})`
            : "Serie TV annunciata o non ancora trasmessa";
          result.available = false;
          result.mediaStatus = "upcoming";
          result.error = reason;
          result.reason = reason;
          result.releaseDate = lookupSeries.firstAired || undefined;
          return NextResponse.json(result);
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FASE 3: RICERCA INDEXER VIA PROWLARR (PER TITOLI RILASCIATI)
    // ══════════════════════════════════════════════════════════════════════════
    if (prowlarrUrl && prowlarrApiKey) {
      const category = isMovie ? "2000" : "5000";
      const collectedRaw: any[] = [];
      const seenGuids = new Set<string>();

      const addRaw = (items: any[]) => {
        if (!Array.isArray(items)) return;
        for (const item of items) {
          const key = item.guid || item.downloadUrl || item.magnetUrl || item.title;
          if (key && !seenGuids.has(key)) {
            seenGuids.add(key);
            collectedRaw.push(item);
          }
        }
      };

      // 3.1 Ricerca via TMDb ID
      if (tmdbId) {
        const idQuery = `{tmdb:${tmdbId}}`;
        const idRes = await nasGet(
          prowlarrUrl,
          prowlarrApiKey,
          `/api/v1/search?query=${encodeURIComponent(idQuery)}&categories=${category}&type=search`,
          8000
        );
        if (idRes.ok && Array.isArray(idRes.data)) {
          addRaw(idRes.data);
        }
      }

      // 3.2 Ricerca testuale con titolo italiano
      const searchQueries = new Set<string>();
      if (year && isMovie) {
        searchQueries.add(`${cleanTitle} ${year}`);
      }
      searchQueries.add(cleanTitle);

      // 3.3 Ricerca testuale con titolo originale se differente
      if (cleanOriginalTitle && cleanOriginalTitle.toLowerCase() !== cleanTitle.toLowerCase()) {
        if (year && isMovie) {
          searchQueries.add(`${cleanOriginalTitle} ${year}`);
        }
        searchQueries.add(cleanOriginalTitle);
      }

      for (const query of searchQueries) {
        const textRes = await nasGet(
          prowlarrUrl,
          prowlarrApiKey,
          `/api/v1/search?query=${encodeURIComponent(query)}&categories=${category}&type=search`,
          9000
        );
        if (textRes.ok && Array.isArray(textRes.data)) {
          addRaw(textRes.data);
        }
        // Se abbiamo già trovato almeno una decina di release, non sovraccarichiamo
        if (collectedRaw.length >= 15) break;
      }

      const validReleases = parseReleases(collectedRaw, cleanTitle, cleanOriginalTitle, year);
      if (validReleases.length > 0) {
        result.releases = validReleases;
        result.count = validReleases.length;
        result.available = true;
        result.mediaStatus = "released";
        return NextResponse.json(result);
      }
    }

    // Se nessun indexer o NAS ha trovato release conformi
    result.available = false;
    result.count = 0;
    result.releases = [];
    result.mediaStatus = "missing";
    result.error = "Nessuna release conforme ai profili di qualità e lingua (Audio Italiano) trovata sui tracker.";
    result.reason = "Nessuna release conforme ai profili di qualità e lingua (Audio Italiano) trovata sui tracker.";
  } catch (err: any) {
    result.error = "NAS o indexer momentaneamente non raggiungibili";
    console.warn("Indexer lookup exception:", err?.message);
  }

  return NextResponse.json(result);
}
