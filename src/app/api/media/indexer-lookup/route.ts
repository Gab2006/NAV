import { IndexerLookupResult, IndexerRelease } from "@/types/media";
import { NextRequest, NextResponse } from "next/server";

function parseReleases(raw: any[]): IndexerRelease[] {
  return raw
    .filter((r) => r && r.title)
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
    // ── STRATEGIA 1: Ricerca diretta tramite PROWLARR (se configurato) ─────
    // Prowlarr permette la ricerca ad-hoc di qualsiasi titolo attraverso tutti gli indexer
    // senza necessità che il film/serie sia già salvato nella libreria di Radarr/Sonarr.
    if (prowlarrUrl && prowlarrApiKey) {
      const category = isMovie ? "2000" : "5000";
      const cleanTitle = title.replace(/[:]/g, " ").trim();
      const termWithYear = year && isMovie ? `${cleanTitle} ${year}` : cleanTitle;

      let prowlarrRes = await nasGet(
        prowlarrUrl,
        prowlarrApiKey,
        `/api/v1/search?query=${encodeURIComponent(termWithYear)}&categories=${category}&type=search`,
        12000
      );

      // Se non trova nulla con l'anno, riprova solo con il titolo
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
        const releases = parseReleases(prowlarrRes.data);
        result.releases = releases;
        result.count = releases.length;
        result.available = releases.length > 0;
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
          const releases = parseReleases(relRes.data);
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
