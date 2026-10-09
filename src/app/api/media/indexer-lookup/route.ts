import { IndexerLookupResult, IndexerRelease } from "@/types/media";
import { NextRequest, NextResponse } from "next/server";

/** Parole comuni da ignorare nel confronto titoli */
const STOP_WORDS = new Set([
  "the","a","an","of","in","on","at","to","for","and","or","is","it",
  "il","lo","la","i","gli","le","di","da","in","con","su","per","tra","fra",
  "un","una","del","della","dei","delle","degli",
]);

/**
 * Verifica che il titolo del release contenga almeno una parola significativa
 * del titolo cercato. Usa le prime N parole del titolo pulito come chiave.
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

  // Quante parole chiave devono matchare (almeno la prima, o metà se il titolo è lungo)
  const required = searchWords.length <= 2 ? 1 : Math.ceil(searchWords.length * 0.5);

  // Controlla che il release contenga almeno `required` parole del titolo cercato
  let matched = 0;
  for (const word of searchWords) {
    if (releaseWords.some((rw) => rw === word || rw.startsWith(word) || word.startsWith(rw))) {
      matched++;
    }
  }

  // Se abbiamo l'anno, verifica anche quello (aiuta a escludere film omonimi)
  if (year && matched >= required) {
    const hasYear = releaseTitle.includes(year);
    // Se il titolo originale ha anno, preferisci release con anno corretto
    // ma non escludere se il release non lo riporta (non tutti lo mettono)
    if (!hasYear) return matched >= Math.ceil(searchWords.length * 0.7);
  }

  return matched >= required;
}

function isDownloadable(r: any): boolean {
  const protocol = (r.protocol ?? "").toLowerCase();
  // Usenet/NZB: sempre scaricabile
  if (protocol === "usenet") return true;
  // Torrent: richiede almeno 1 seeder
  const seeders = r.seeders ?? r.seedCount ?? null;
  if (protocol === "torrent") return seeders !== null && seeders > 0;
  // Protocol sconosciuto: usa seeders come proxy (>0 = ok, assente → escludi)
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

  try {
    // ── STRATEGIA 1: Ricerca per TMDb ID tramite PROWLARR ────────────────────
    // Se Prowlarr risponde (ok=true) con 0 risultati → il film NON è disponibile.
    // Non usiamo il fallback testuale che genera falsi positivi.
    if (prowlarrUrl && prowlarrApiKey && tmdbId) {
      const category = isMovie ? "2000" : "5000";
      const idQuery = `{tmdb:${tmdbId}}`;

      const idRes = await nasGet(
        prowlarrUrl,
        prowlarrApiKey,
        `/api/v1/search?query=${encodeURIComponent(idQuery)}&categories=${category}&type=search`,
        12000
      );

      if (idRes.ok) {
        // Prowlarr ha risposto: questo è il risultato definitivo
        const rawData = Array.isArray(idRes.data) ? idRes.data : [];
        const releases = parseReleases(rawData);
        result.releases = releases;
        result.count = releases.length;
        result.available = releases.length > 0;
        if (!result.available) {
          result.error = rawData.length > 0
            ? "Nessun file scaricabile (torrent senza seeders)"
            : "Non trovato sugli indexer";
        }
        return NextResponse.json(result);
      }
      // idRes.ok === false: Prowlarr non raggiungibile, proviamo il fallback testuale
    }

    // ── STRATEGIA 2: Ricerca testuale tramite PROWLARR ───────────────────────
    // Usata solo se: non abbiamo tmdbId, OPPURE Prowlarr non era raggiungibile.
    if (prowlarrUrl && prowlarrApiKey && !tmdbId) {
      const category = isMovie ? "2000" : "5000";
      const cleanTitle = title.replace(/[:]/g, " ").trim();
      const termWithYear = year && isMovie ? `${cleanTitle} ${year}` : cleanTitle;

      let prowlarrRes = await nasGet(
        prowlarrUrl,
        prowlarrApiKey,
        `/api/v1/search?query=${encodeURIComponent(termWithYear)}&categories=${category}&type=search`,
        12000
      );

      if (
        (!prowlarrRes.ok || !Array.isArray(prowlarrRes.data) || prowlarrRes.data.length === 0) &&
        year &&
        isMovie
      ) {
        prowlarrRes = await nasGet(
          prowlarrUrl,
          prowlarrApiKey,
          `/api/v1/search?query=${encodeURIComponent(cleanTitle)}&categories=${category}&type=search`,
          10000
        );
      }

      if (prowlarrRes.ok && Array.isArray(prowlarrRes.data)) {
        const rawCount = prowlarrRes.data.filter((r: any) => r && r.title).length;
        const releases = parseReleases(prowlarrRes.data, cleanTitle, year);
        result.releases = releases;
        result.count = releases.length;
        result.available = releases.length > 0;
        if (!result.available && rawCount > 0) {
          result.error = "Nessun file trovato per questo titolo negli indexer";
        }
        return NextResponse.json(result);
      }
    }

    // ── STRATEGIA 2: Media già presente nella libreria Radarr/Sonarr ─────
    if (targetUrl && apiKey && tmdbId) {
      const libraryPath = isMovie
        ? `/api/v3/movie?tmdbId=${tmdbId}`
        : `/api/v3/series?tmdbId=${tmdbId}`;
      const libraryRes = await nasGet(targetUrl, apiKey, libraryPath, 4000);

      const libraryItems = Array.isArray(libraryRes.data)
        ? libraryRes.data
        : libraryRes.data
        ? [libraryRes.data]
        : [];
      const libraryItem = libraryItems[0];

      if (libraryItem?.id) {
        const releaseParam = isMovie
          ? `movieId=${libraryItem.id}`
          : `seriesId=${libraryItem.id}`;
        const relRes = await nasGet(
          targetUrl,
          apiKey,
          `/api/v3/release?${releaseParam}`,
          10000
        );

        if (relRes.ok && Array.isArray(relRes.data)) {
          const releases = parseReleases(relRes.data, title, year);
          result.releases = releases;
          result.count = releases.length;
          result.available = releases.length > 0;
          return NextResponse.json(result);
        }
      }
    }

    // ── STRATEGIA 3: Radarr/Sonarr catalog check (senza Prowlarr) ─────
    if (targetUrl && apiKey) {
      const catalogTerm = year && isMovie ? `${title} ${year}` : title;
      const catalogPath = isMovie
        ? `/api/v3/movie/lookup?term=${encodeURIComponent(catalogTerm)}`
        : `/api/v3/series/lookup?term=${encodeURIComponent(title)}`;
      const catalogRes = await nasGet(targetUrl, apiKey, catalogPath, 6000);

      if (catalogRes.ok && Array.isArray(catalogRes.data) && catalogRes.data.length > 0) {
        result.available = false;
        result.count = 0;
        result.releases = [];
        result.error =
          "Titolo trovato a catalogo. Per scansionare le release senza Prowlarr, aggiungi il titolo alla libreria di Radarr/Sonarr.";
        return NextResponse.json(result);
      }
    }

    // Nessuna release trovata
    result.available = false;
    result.count = 0;
    result.releases = [];
  } catch (err: any) {
    result.error = "NAS o indexer non raggiungibili";
    console.warn("Indexer lookup exception:", err?.message);
  }

  return NextResponse.json(result);
}
