import { getNasLibraryMedia } from "@/lib/nas-service";
import {
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
    const [trending, movies, tvShows, newReleases, topRated, nasLibrary] =
      await Promise.all([
        getTrending(1),
        getPopularMovies(1),
        getPopularTV(1),
        getNewReleases(1),
        getTopRated(1),
        getNasLibraryMedia(),
      ]);

    return NextResponse.json({
      hero: trending[0] || movies[0] || null,
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

export async function POST(req: Request) {
  try {
    const { id, tmdbId, type, title, year } = await req.json();

    if (type === 'movie') {
      // 1. Invio comando a Radarr per i Film
      const res = await fetch(`${process.env.RADARR_URL}/api/v3/movie`, {
        method: 'POST',
        headers: {
          'X-Api-Key': process.env.RADARR_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
          tmdbId: tmdbId || id,
          year: year,
          qualityProfileId: 1, // Profilo predefinito
          rootFolderPath: '/media/Film', // Cartella montata nel container
          monitored: true,
          addOptions: {
            searchForMovie: true, // Avvia subito la ricerca e il download torrent!
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMessage = Array.isArray(errorData)
          ? errorData.map((e: any) => e.errorMessage || e.message).join(', ')
          : (errorData?.message || errorData?.errorMessage || JSON.stringify(errorData) || 'Errore durante la richiesta al server');
        return NextResponse.json({ error: errorMessage }, { status: res.status });
      }

      return NextResponse.json({ success: true, message: 'Film aggiunto e download avviato!' });

    } else if (type === 'tv') {
      // 2. Prima cerchiamo la serie su Sonarr tramite TVDb/TMDb per ottenere i dati necessari
      const lookupRes = await fetch(
        `${process.env.SONARR_URL}/api/v3/series/lookup?term=${encodeURIComponent(title)}`,
        {
          headers: { 'X-Api-Key': process.env.SONARR_API_KEY! },
        }
      );
      const seriesList = await lookupRes.json();
      const seriesData = seriesList[0];

      if (!seriesData) {
        return NextResponse.json({ error: 'Titolo non trovato nel catalogo' }, { status: 404 });
      }

      // 3. Invio comando a Sonarr per scaricare tutte le stagioni
      const res = await fetch(`${process.env.SONARR_URL}/api/v3/series`, {
        method: 'POST',
        headers: {
          'X-Api-Key': process.env.SONARR_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...seriesData,
          qualityProfileId: 1,
          rootFolderPath: '/media/SerieTV',
          monitored: true,
          addOptions: {
            searchForMissingEpisodes: true, // Scarica tutti gli episodi disponibili
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMessage = Array.isArray(errorData)
          ? errorData.map((e: any) => e.errorMessage || e.message).join(', ')
          : (errorData?.message || errorData?.errorMessage || JSON.stringify(errorData) || 'Errore durante la richiesta al server');
        return NextResponse.json({ error: errorMessage }, { status: res.status });
      }

      return NextResponse.json({ success: true, message: 'Serie aggiunta e download avviato!' });
    }

    return NextResponse.json({ error: 'Tipo non supportato' }, { status: 400 });
  } catch (error: any) {
    console.error('Errore API download:', error);
    return NextResponse.json({ error: error?.message || 'Errore interno del server' }, { status: 500 });
  }
}
