import { MediaDetail, MediaItem, MediaType } from "@/types/media";
import {
  MOCK_HERO,
  MOCK_MOVIES,
  MOCK_NEW_RELEASES,
  MOCK_TOP_RATED,
  MOCK_TRENDING,
  MOCK_TV_SHOWS,
} from "./mock-data";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type TmdbImageSize =
  | "w92"
  | "w154"
  | "w185"
  | "w300"
  | "w342"
  | "w500"
  | "w780"
  | "w1280"
  | "original";

export function getImageUrl(
  path: string | null | undefined,
  size: TmdbImageSize = "w342"
): string {
  if (!path) {
    return "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80";
  }
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

function getApiKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_TMDB_API_KEY ||
    process.env.TMDB_API_KEY ||
    undefined
  );
}

// Convert raw TMDB item to normalized MediaItem
function formatTmdbItem(item: any, defaultType?: MediaType): MediaItem {
  const isMovie = item.title !== undefined || item.media_type === "movie";
  const mediaType: MediaType = defaultType || (isMovie ? "movie" : "tv");

  return {
    id: item.id,
    title: item.title || item.name || "Senza Titolo",
    originalTitle: item.original_title || item.original_name,
    overview:
      item.overview ||
      "Nessuna sinossi disponibile al momento per questo titolo.",
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    mediaType,
    releaseDate: item.release_date || item.first_air_date || "",
    voteAverage: Number((item.vote_average || 0).toFixed(1)),
    voteCount: item.vote_count || 0,
    genreIds: item.genre_ids || [],
    popularity: item.popularity || 0,
  };
}

export async function getTrending(page: number = 1): Promise<MediaItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) return MOCK_TRENDING;

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/trending/all/day?api_key=${apiKey}&language=it-IT&page=${page}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("TMDB Error");
    const data = await res.json();
    return (data.results || [])
      .filter((i: any) => i.poster_path && (i.media_type === "movie" || i.media_type === "tv"))
      .map((i: any) => formatTmdbItem(i));
  } catch {
    return MOCK_TRENDING;
  }
}

export async function getPopularMovies(page: number = 1): Promise<MediaItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) return MOCK_MOVIES;

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/movie/popular?api_key=${apiKey}&language=it-IT&page=${page}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("TMDB Error");
    const data = await res.json();
    return (data.results || [])
      .filter((i: any) => i.poster_path)
      .map((i: any) => formatTmdbItem(i, "movie"));
  } catch {
    return MOCK_MOVIES;
  }
}

export async function getPopularTV(page: number = 1): Promise<MediaItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) return MOCK_TV_SHOWS;

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/tv/popular?api_key=${apiKey}&language=it-IT&page=${page}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("TMDB Error");
    const data = await res.json();
    return (data.results || [])
      .filter((i: any) => i.poster_path)
      .map((i: any) => formatTmdbItem(i, "tv"));
  } catch {
    return MOCK_TV_SHOWS;
  }
}

export async function getNewReleases(page: number = 1): Promise<MediaItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) return MOCK_NEW_RELEASES;

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/movie/now_playing?api_key=${apiKey}&language=it-IT&page=${page}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("TMDB Error");
    const data = await res.json();
    return (data.results || [])
      .filter((i: any) => i.poster_path)
      .map((i: any) => formatTmdbItem(i, "movie"));
  } catch {
    return MOCK_NEW_RELEASES;
  }
}

export async function getTopRated(page: number = 1): Promise<MediaItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) return MOCK_TOP_RATED;

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/movie/top_rated?api_key=${apiKey}&language=it-IT&page=${page}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("TMDB Error");
    const data = await res.json();
    return (data.results || [])
      .filter((i: any) => i.poster_path)
      .map((i: any) => formatTmdbItem(i, "movie"));
  } catch {
    return MOCK_TOP_RATED;
  }
}

export async function getHeroMovies(limit: number = 5): Promise<MediaItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) return MOCK_TOP_RATED.slice(0, limit);

  try {
    // Esclude l'animazione (genere 16) e richiede almeno 3000 voti per garantire solo autentici capolavori del cinema
    const res = await fetch(
      `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&language=it-IT&sort_by=vote_average.desc&vote_count.gte=3000&without_genres=16&page=1`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("TMDB Error");
    const data = await res.json();
    const filtered: MediaItem[] = (data.results || [])
      .filter(
        (m: any) =>
          m.backdrop_path &&
          m.poster_path &&
          m.overview &&
          m.overview.trim().length > 20
      )
      .map((m: any) => formatTmdbItem(m, "movie"));

    if (filtered.length >= limit) {
      return filtered.slice(0, limit);
    }

    if (filtered.length > 0) {
      const rest = MOCK_TOP_RATED.filter(
        (mock: MediaItem) => !filtered.some((f: MediaItem) => f.id === mock.id)
      );
      return [...filtered, ...rest].slice(0, limit);
    }

    return MOCK_TOP_RATED.slice(0, limit);
  } catch {
    return MOCK_TOP_RATED.slice(0, limit);
  }
}

export async function getPaginatedMedia(
  category: string,
  page: number = 1
): Promise<SearchResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { results: [], totalResults: 0, totalPages: 0, page: 1 };
  }

  try {
    let endpoint = "";
    let defaultType: MediaType = "movie";

    switch (category) {
      case "movie":
      case "movies":
      case "popular_movies":
        endpoint = `${TMDB_BASE_URL}/movie/popular?api_key=${apiKey}&language=it-IT&page=${page}`;
        defaultType = "movie";
        break;
      case "tv":
      case "series":
      case "popular_tv":
        endpoint = `${TMDB_BASE_URL}/tv/popular?api_key=${apiKey}&language=it-IT&page=${page}`;
        defaultType = "tv";
        break;
      case "trending":
      case "popular":
        endpoint = `${TMDB_BASE_URL}/trending/all/day?api_key=${apiKey}&language=it-IT&page=${page}`;
        break;
      case "new_releases":
      case "now_playing":
        endpoint = `${TMDB_BASE_URL}/movie/now_playing?api_key=${apiKey}&language=it-IT&page=${page}`;
        defaultType = "movie";
        break;
      case "top_rated":
        endpoint = `${TMDB_BASE_URL}/movie/top_rated?api_key=${apiKey}&language=it-IT&page=${page}`;
        defaultType = "movie";
        break;
      default:
        endpoint = `${TMDB_BASE_URL}/movie/popular?api_key=${apiKey}&language=it-IT&page=${page}`;
        defaultType = "movie";
    }

    const res = await fetch(endpoint, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("TMDB Error");
    const data = await res.json();

    const results = (data.results || [])
      .filter((i: any) => i.poster_path)
      .map((i: any) => formatTmdbItem(i, defaultType));

    return {
      results,
      totalResults: data.total_results || results.length,
      totalPages: Math.min(data.total_pages || 1, 500),
      page: data.page || page,
    };
  } catch (error) {
    console.error("getPaginatedMedia error:", error);
    return { results: [], totalResults: 0, totalPages: 0, page: 1 };
  }
}

export async function getMediaDetails(
  id: number,
  type: MediaType
): Promise<MediaDetail> {
  const apiKey = getApiKey();
  if (!apiKey) {
    if (id === MOCK_HERO.id) return MOCK_HERO;
    const found = [
      ...MOCK_TRENDING,
      ...MOCK_MOVIES,
      ...MOCK_TV_SHOWS,
      ...MOCK_NEW_RELEASES,
    ].find((item) => item.id === id);

    if (found) {
      return {
        ...found,
        tagline: found.title,
        runtime: found.mediaType === "movie" ? 124 : undefined,
        numberOfSeasons: found.mediaType === "tv" ? 3 : undefined,
        numberOfEpisodes: found.mediaType === "tv" ? 24 : undefined,
        trailerKey: "Way9Dexny3w",
        cast: MOCK_HERO.cast,
      };
    }
    return MOCK_HERO;
  }

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/${type}/${id}?api_key=${apiKey}&language=it-IT&append_to_response=videos,credits`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("Failed to fetch detail");
    const data = await res.json();

    const trailer = data.videos?.results?.find(
      (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
    ) || data.videos?.results?.[0];

    const cast = (data.credits?.cast || []).slice(0, 8).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
    }));

    return {
      id: data.id,
      title: data.title || data.name || "Senza Titolo",
      originalTitle: data.original_title || data.original_name,
      overview: data.overview || "Nessuna sinossi disponibile.",
      posterPath: data.poster_path,
      backdropPath: data.backdrop_path,
      mediaType: type,
      releaseDate: data.release_date || data.first_air_date || "",
      voteAverage: Number((data.vote_average || 0).toFixed(1)),
      voteCount: data.vote_count || 0,
      genres: (data.genres || []).map((g: any) => g.name),
      runtime: data.runtime,
      numberOfSeasons: data.number_of_seasons,
      numberOfEpisodes: data.number_of_episodes,
      tagline: data.tagline,
      trailerKey: trailer?.key || null,
      cast,
      status: data.status,
    };
  } catch {
    return MOCK_HERO;
  }
}

export interface SearchResponse {
  results: MediaItem[];
  totalResults: number;
  totalPages: number;
  page: number;
}

export async function searchMedia(
  query: string,
  page: number = 1,
  type?: "movie" | "tv" | "all"
): Promise<SearchResponse> {
  const apiKey = getApiKey();
  if (!apiKey || !query.trim()) {
    return { results: [], totalResults: 0, totalPages: 0, page: 1 };
  }

  try {
    let endpoint = `${TMDB_BASE_URL}/search/multi`;
    if (type === "movie") endpoint = `${TMDB_BASE_URL}/search/movie`;
    else if (type === "tv") endpoint = `${TMDB_BASE_URL}/search/tv`;

    const res = await fetch(
      `${endpoint}?api_key=${apiKey}&language=it-IT&query=${encodeURIComponent(
        query.trim()
      )}&page=${page}&include_adult=false`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) throw new Error("TMDB Search Error");
    const data = await res.json();

    const results = (data.results || [])
      .filter((i: any) => {
        if (i.media_type === "person") return false;
        if (!i.title && !i.name) return false;
        return true;
      })
      .map((i: any) =>
        formatTmdbItem(
          i,
          type === "movie" ? "movie" : type === "tv" ? "tv" : undefined
        )
      );

    return {
      results,
      totalResults: data.total_results || results.length,
      totalPages: data.total_pages || 1,
      page: data.page || page,
    };
  } catch (error) {
    console.error("Errore durante la ricerca TMDB:", error);
    return { results: [], totalResults: 0, totalPages: 0, page: 1 };
  }
}

