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
 * Verifica che il titolo del release contenga almeno una parola significativa
 * del titolo cercato.
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

  const required = searchWords.length <= 2 ? 1 : Math.ceil(searchWords.length * 0.5);

  let matched = 0;
  for (const word of searchWords) {
    if (releaseWords.some((rw) => rw === word || rw.startsWith(word) || word.startsWith(rw))) {
      matched++;
    }
  }

  if (year && matched >= required) {
    const hasYear = releaseTitle.includes(year);
    if (!hasYear) return matched >= Math.ceil(searchWords.length * 0.7);
  }

  return matched >= required;
}

function isDownloadable(r: any): boolean {
  if (!r || !r.title) return false;
  // Esclude copie registrate al cinema e bootleg
  if (isBootlegOrCam(r.title)) return false;

  const protocol = (r.protocol ?? "").toLowerCase();
  if (protocol === "usenet") return true;

  const seeders = r.seeders ?? r.seedCount ?? null;
  if (protocol === "torrent") return seeders !== null && seeders > 0;
  return seeders !== null && seeders > 0;
}

function parseReleases(raw: any[], searchTitle?: string, year?: string | null): IndexerRelease[] {
  return raw
    .filter((r) => {
      if (!r || !r.title) return false;
      if (!isDownloadable(r)) return false;
      if (searchTitle && !titleMatches(r.title, searchTitle, year)) return false;
      return true;
    })
    .map((r) => {
      const qualityMatch = r.title.match(
        /\b(2160p|4k|1080p|720p|bluray|bdrip|web-?dl|dvdrip|hdtv)\b/i
      );
      return {
        guid: r.guid || r.downloadUrl || r.magnetUrl || r.infoUrl || r.title,
        title: r.title,
        indexer: r.indexer || (Array.isArray(r.indexerFlags) ? r.indexerFlags[0] : r.indexerFlags) || "Indexer",
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

  const cleanTitle = title.replace(/[:]/g, " ").trim();

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // FASE 1: VERIFICA RADARR (PER FILM)
    // ══════════════════════════════════════════════════════════════════════════
    if (isMovie && targetUrl && apiKey) {
      // 1.1 Controlla se il film è già presente nella libreria Radarr
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
                (r.approved === true || !r.rejected) &&
                !isBootlegOrCam(r.title) &&
                isDownloadable(r)
            );

            if (approved.length > 0) {
              const parsed = parseReleases(approved, title, year);
              result.available = parsed.length > 0;
              result.count = parsed.length;
              result.releases = parsed;
              result.mediaStatus = "released";
              return NextResponse.json(result);
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

      // 1.2 Se non presente in libreria, consultiamo il catalogo Radarr (lookup)
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
      // 2.1 Controlla se la serie è già presente nella libreria Sonarr
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
                (r.approved === true || !r.rejected) &&
                !isBootlegOrCam(r.title) &&
                isDownloadable(r)
            );
            if (approved.length > 0) {
              const parsed = parseReleases(approved, title, year);
              result.available = parsed.length > 0;
              result.count = parsed.length;
              result.releases = parsed;
              result.mediaStatus = "released";
              return NextResponse.json(result);
            }
          }
        }
      }

      // 2.2 Consultazione Sonarr lookup
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
    // FASE 3: RICERCA INDEXER VIA PROWLARR (PER TITOLI GIÀ RILASCIATI)
    // ══════════════════════════════════════════════════════════════════════════
    if (prowlarrUrl && prowlarrApiKey) {
      const category = isMovie ? "2000" : "5000";

      // 3.1 Tentativo per TMDb ID
      if (tmdbId) {
        const idQuery = `{tmdb:${tmdbId}}`;
        const idRes = await nasGet(
          prowlarrUrl,
          prowlarrApiKey,
          `/api/v1/search?query=${encodeURIComponent(idQuery)}&categories=${category}&type=search`,
          10000
        );

        if (idRes.ok && Array.isArray(idRes.data)) {
          const validReleases = parseReleases(idRes.data, cleanTitle, year);
          if (validReleases.length > 0) {
            result.releases = validReleases;
            result.count = validReleases.length;
            result.available = true;
            result.mediaStatus = "released";
            return NextResponse.json(result);
          }
        }
      }

      // 3.2 Ricerca testuale con filtro rigido contro CAM / screener
      const termWithYear = year && isMovie ? `${cleanTitle} ${year}` : cleanTitle;
      let textRes = await nasGet(
        prowlarrUrl,
        prowlarrApiKey,
        `/api/v1/search?query=${encodeURIComponent(termWithYear)}&categories=${category}&type=search`,
        10000
      );

      if (
        (!textRes.ok || !Array.isArray(textRes.data) || textRes.data.length === 0) &&
        year &&
        isMovie
      ) {
        textRes = await nasGet(
          prowlarrUrl,
          prowlarrApiKey,
          `/api/v1/search?query=${encodeURIComponent(cleanTitle)}&categories=${category}&type=search`,
          8000
        );
      }

      if (textRes.ok && Array.isArray(textRes.data)) {
        const validReleases = parseReleases(textRes.data, cleanTitle, year);
        result.releases = validReleases;
        result.count = validReleases.length;
        result.available = validReleases.length > 0;
        result.mediaStatus = validReleases.length > 0 ? "released" : "missing";

        if (!result.available) {
          result.error = "Nessun file valido in qualità digitale/home video disponibile";
          result.reason = "Nessun file conforme ai profili di qualità e lingua del NAS trovato.";
        }
        return NextResponse.json(result);
      }
    }

    // Se nessun indexer o NAS ha trovato release valide
    result.available = false;
    result.count = 0;
    result.releases = [];
    result.error = "Nessun file scaricabile disponibile per il download";
    result.reason = "Nessun file disponibile per il download.";
  } catch (err: any) {
    result.error = "NAS o indexer momentaneamente non raggiungibili";
    console.warn("Indexer lookup exception:", err?.message);
  }

  return NextResponse.json(result);
}
