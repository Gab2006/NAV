import { getNasLibraryMedia } from "@/lib/nas-service";
import {
  getHeroMovies,
  getNewReleases,
  getPaginatedMedia,
  getPopularMovies,
  getPopularTV,
  getTopRated,
  getTrending,
} from "@/lib/tmdb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const pageParam = searchParams.get("page");
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

    // 1. If category=nas, return items from NAS server (Radarr & Sonarr)
    if (category === "nas") {
      const items = await getNasLibraryMedia();
      return NextResponse.json({
        results: items,
        page: 1,
        totalPages: 1,
        totalResults: items.length,
      });
    }

    // 2. If a specific category is requested, return paginated results from TMDb
    if (category) {
      const data = await getPaginatedMedia(category, page);
      return NextResponse.json(data);
    }

    // 3. If no category parameter, return all dynamic home sections
    const [heroMovies, trending, movies, tvShows, newReleases, topRated, nasLibrary] =
      await Promise.all([
        getHeroMovies(5),
        getTrending(1),
        getPopularMovies(1),
        getPopularTV(1),
        getNewReleases(1),
        getTopRated(1),
        getNasLibraryMedia(),
      ]);

    return NextResponse.json({
      hero: heroMovies[0] || trending[0] || movies[0] || null,
      heroItems: heroMovies,
      trending,
      movies,
      tvShows,
      newReleases,
      topRated,
      nasLibrary,
    });
  } catch (error: any) {
    console.error("GET /api/media error:", error);
    return NextResponse.json(
      {
        error: "Errore durante il recupero dei dati multimediali",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

async function prowlarrFindBestItalianRelease(
  query: string,
  category: string,
  year?: number | string,
  originalTitle?: string
): Promise<any | null> {
  const prowlarrUrl = process.env.PROWLARR_URL;
  const prowlarrApiKey = process.env.PROWLARR_API_KEY;
  if (!prowlarrUrl || !prowlarrApiKey) return null;

  const queries = new Set<string>();
  const cleanQ = query.replace(/[:\/]/g, " ").trim();
  if (year) queries.add(`${cleanQ} ${year}`);
  queries.add(cleanQ);

  if (originalTitle && originalTitle.toLowerCase() !== query.toLowerCase()) {
    const cleanOrig = originalTitle.replace(/[:\/]/g, " ").trim();
    if (year) queries.add(`${cleanOrig} ${year}`);
    queries.add(cleanOrig);
  }

  const collected: any[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    try {
      const res = await fetch(
        `${prowlarrUrl}/api/v1/search?query=${encodeURIComponent(q)}&categories=${category}&type=search`,
        {
          headers: { "X-Api-Key": prowlarrApiKey },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            const id = item.guid || item.downloadUrl || item.magnetUrl;
            if (id && !seen.has(id)) {
              seen.add(id);
              collected.push(item);
            }
          }
        }
      }
    } catch {}
    if (collected.length >= 20) break;
  }

  const isBootleg = (t: string) =>
    /\b(cam|camrip|hdcam|ts|telesync|hdts|tc|telecine|dvdscr|scr|screener|workprint|r5|r6)\b/i.test(t);
  const hasIta = (t: string) => /\b(ita|italian|italiano|sub[\s._-]*ita)\b/i.test(t);

  const valid = collected.filter((r) => {
    if (!r.title || isBootleg(r.title)) return false;
    const seeders = r.seeders ?? r.seedCount ?? null;
    if (seeders !== null && seeders <= 0) return false;
    if (!hasIta(r.title)) return false;
    return true;
  });

  if (valid.length === 0) return null;

  valid.sort((a, b) => (b.seeders ?? 0) - (a.seeders ?? 0));
  return valid[0];
}

export async function POST(req: Request) {
  try {
    const { id, tmdbId, type, title, originalTitle, year } = await req.json();
    const effectiveTmdbId = tmdbId || id;
    const isMovie = type === "movie";

    if (isMovie) {
      const radarrUrl = process.env.RADARR_URL;
      const radarrApiKey = process.env.RADARR_API_KEY;

      if (!radarrUrl || !radarrApiKey) {
        return NextResponse.json({ error: "Radarr non configurato" }, { status: 503 });
      }

      let radarrMovie: any = null;

      // 1. Controlla se il film esiste già nella libreria Radarr
      if (effectiveTmdbId) {
        const checkRes = await fetch(`${radarrUrl}/api/v3/movie?tmdbId=${effectiveTmdbId}`, {
          headers: { "X-Api-Key": radarrApiKey },
        });
        if (checkRes.ok) {
          const list = await checkRes.json();
          radarrMovie = Array.isArray(list) ? list[0] : list;
        }
      }

      // 2. Se non esiste, lo aggiunge a Radarr
      if (!radarrMovie || !radarrMovie.id) {
        const addRes = await fetch(`${radarrUrl}/api/v3/movie`, {
          method: "POST",
          headers: {
            "X-Api-Key": radarrApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: originalTitle || title,
            tmdbId: effectiveTmdbId,
            year: year,
            qualityProfileId: 1,
            rootFolderPath: "/media/Film",
            monitored: true,
            addOptions: {
              searchForMovie: true,
            },
          }),
        });

        if (addRes.ok) {
          radarrMovie = await addRes.json();
        } else {
          // Se già presente su Radarr sotto altro id/lookup, recuperiamolo
          const checkRes = await fetch(`${radarrUrl}/api/v3/movie?tmdbId=${effectiveTmdbId}`, {
            headers: { "X-Api-Key": radarrApiKey },
          });
          if (checkRes.ok) {
            const list = await checkRes.json();
            radarrMovie = Array.isArray(list) ? list[0] : list;
          }
        }
      }

      if (!radarrMovie || !radarrMovie.id) {
        return NextResponse.json(
          { error: "Impossibile registrare o trovare il film su Radarr" },
          { status: 500 }
        );
      }

      // 3. Avvia la ricerca manuale su Radarr
      await fetch(`${radarrUrl}/api/v3/command`, {
        method: "POST",
        headers: {
          "X-Api-Key": radarrApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "MoviesSearch",
          movieIds: [radarrMovie.id],
        }),
      }).catch(() => {});

      // 4. Se dopo un istante la coda non ha ancora catturato una release, cerchiamo con Prowlarr ed effettuiamo il push
      setTimeout(async () => {
        try {
          const qRes = await fetch(`${radarrUrl}/api/v3/queue?movieId=${radarrMovie.id}`, {
            headers: { "X-Api-Key": radarrApiKey },
          });
          let inQueue = false;
          if (qRes.ok) {
            const qData = await qRes.json();
            const recs = qData.records || qData || [];
            inQueue = recs.some((r: any) => r.movieId === radarrMovie.id);
          }

          if (!inQueue) {
            const bestRelease = await prowlarrFindBestItalianRelease(
              title,
              "2000",
              year,
              originalTitle || radarrMovie.title
            );
            if (bestRelease) {
              const pushTitle = `${radarrMovie.title} (${radarrMovie.year || year || 2024}) ${bestRelease.title.replace(/[:\/]/g, " ")}`;
              await fetch(`${radarrUrl}/api/v3/release/push`, {
                method: "POST",
                headers: {
                  "X-Api-Key": radarrApiKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  title: pushTitle,
                  downloadUrl: bestRelease.downloadUrl || undefined,
                  magnetUrl:
                    bestRelease.magnetUrl ||
                    (bestRelease.guid?.startsWith("magnet:") ? bestRelease.guid : undefined),
                  protocol: "torrent",
                  publishDate: bestRelease.publishDate || new Date().toISOString(),
                }),
              });
            }
          }
        } catch (err) {
          console.warn("Async Prowlarr push error for movie:", err);
        }
      }, 1500);

      return NextResponse.json({
        success: true,
        message: "Film aggiunto e ricerca/download avviati sul server!",
      });

    } else if (type === "tv") {
      const sonarrUrl = process.env.SONARR_URL;
      const sonarrApiKey = process.env.SONARR_API_KEY;

      if (!sonarrUrl || !sonarrApiKey) {
        return NextResponse.json({ error: "Sonarr non configurato" }, { status: 503 });
      }

      let sonarrSeries: any = null;

      // 1. Controlla se la serie esiste già nella libreria Sonarr
      if (effectiveTmdbId) {
        const checkRes = await fetch(`${sonarrUrl}/api/v3/series?tmdbId=${effectiveTmdbId}`, {
          headers: { "X-Api-Key": sonarrApiKey },
        });
        if (checkRes.ok) {
          const list = await checkRes.json();
          sonarrSeries = Array.isArray(list) ? list[0] : list;
        }
      }

      // 2. Se non esiste, effettua lookup e aggiunta
      if (!sonarrSeries || !sonarrSeries.id) {
        const lookupTerm = originalTitle || title;
        const lookupRes = await fetch(
          `${sonarrUrl}/api/v3/series/lookup?term=${encodeURIComponent(lookupTerm)}`,
          {
            headers: { "X-Api-Key": sonarrApiKey },
          }
        );
        const seriesList = await lookupRes.json().catch(() => []);
        const seriesData = Array.isArray(seriesList) ? seriesList[0] : seriesList;

        if (!seriesData) {
          return NextResponse.json({ error: "Titolo non trovato nel catalogo Sonarr" }, { status: 404 });
        }

        const addRes = await fetch(`${sonarrUrl}/api/v3/series`, {
          method: "POST",
          headers: {
            "X-Api-Key": sonarrApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...seriesData,
            qualityProfileId: 1,
            rootFolderPath: "/media/SerieTV",
            monitored: true,
            addOptions: {
              searchForMissingEpisodes: true,
            },
          }),
        });

        if (addRes.ok) {
          sonarrSeries = await addRes.json();
        } else {
          const checkRes = await fetch(`${sonarrUrl}/api/v3/series?tmdbId=${effectiveTmdbId}`, {
            headers: { "X-Api-Key": sonarrApiKey },
          });
          if (checkRes.ok) {
            const list = await checkRes.json();
            sonarrSeries = Array.isArray(list) ? list[0] : list;
          }
        }
      }

      if (!sonarrSeries || !sonarrSeries.id) {
        return NextResponse.json(
          { error: "Impossibile registrare o trovare la serie su Sonarr" },
          { status: 500 }
        );
      }

      // 3. Avvia la ricerca manuale degli episodi
      await fetch(`${sonarrUrl}/api/v3/command`, {
        method: "POST",
        headers: {
          "X-Api-Key": sonarrApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "SeriesSearch",
          seriesId: sonarrSeries.id,
        }),
      }).catch(() => {});

      // 4. Push release italiana da Prowlarr se necessario
      setTimeout(async () => {
        try {
          const qRes = await fetch(`${sonarrUrl}/api/v3/queue?seriesId=${sonarrSeries.id}`, {
            headers: { "X-Api-Key": sonarrApiKey },
          });
          let inQueue = false;
          if (qRes.ok) {
            const qData = await qRes.json();
            const recs = qData.records || qData || [];
            inQueue = recs.some((r: any) => r.seriesId === sonarrSeries.id);
          }

          if (!inQueue) {
            const bestRelease = await prowlarrFindBestItalianRelease(
              title,
              "5000",
              year,
              originalTitle || sonarrSeries.title
            );
            if (bestRelease) {
              const pushTitle = `${sonarrSeries.title} ${bestRelease.title.replace(/[:\/]/g, " ")}`;
              await fetch(`${sonarrUrl}/api/v3/release/push`, {
                method: "POST",
                headers: {
                  "X-Api-Key": sonarrApiKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  title: pushTitle,
                  downloadUrl: bestRelease.downloadUrl || undefined,
                  magnetUrl:
                    bestRelease.magnetUrl ||
                    (bestRelease.guid?.startsWith("magnet:") ? bestRelease.guid : undefined),
                  protocol: "torrent",
                  publishDate: bestRelease.publishDate || new Date().toISOString(),
                }),
              });
            }
          }
        } catch (err) {
          console.warn("Async Prowlarr push error for TV series:", err);
        }
      }, 1500);

      return NextResponse.json({
        success: true,
        message: "Serie aggiunta e ricerca/download avviati sul server!",
      });
    }

    return NextResponse.json({ error: "Tipo non supportato" }, { status: 400 });
  } catch (error: any) {
    console.error("Errore API download:", error);
    return NextResponse.json({ error: error?.message || "Errore interno del server" }, { status: 500 });
  }
}
