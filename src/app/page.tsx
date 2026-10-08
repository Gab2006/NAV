import { HomeView } from "@/components/home-view";
import { MOCK_HERO } from "@/lib/mock-data";
import { getNasLibraryMedia } from "@/lib/nas-service";
import {
  getNewReleases,
  getPopularMovies,
  getPopularTV,
  getTopRated,
  getTrending,
} from "@/lib/tmdb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  // Fetch lists concurrently from API & database
  const [trending, movies, tvShows, newReleases, topRated, nasLibrary] =
    await Promise.all([
      getTrending(1),
      getPopularMovies(1),
      getPopularTV(1),
      getNewReleases(1),
      getTopRated(1),
      getNasLibraryMedia(),
    ]);

  // Use the top trending item as hero if available, otherwise MOCK_HERO
  const heroItem = trending.length > 0 ? trending[0] : MOCK_HERO;

  return (
    <HomeView
      heroItem={heroItem}
      trending={trending}
      movies={movies}
      tvShows={tvShows}
      newReleases={newReleases}
      topRated={topRated}
      nasLibrary={nasLibrary}
    />
  );
}
