import { HomeView } from "@/components/home-view";
import { MOCK_HERO } from "@/lib/mock-data";
import { getNasLibraryMedia } from "@/lib/nas-service";
import {
  getHeroMovies,
  getNewReleases,
  getPopularMovies,
  getPopularTV,
  getTopRated,
  getTrending,
} from "@/lib/tmdb";

export const revalidate = 3600;

export default async function HomePage() {
  // Fetch lists concurrently from API & database
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

  return (
    <HomeView
      heroItems={heroMovies}
      heroItem={heroMovies[0] || trending[0] || MOCK_HERO}
      trending={trending}
      movies={movies}
      tvShows={tvShows}
      newReleases={newReleases}
      topRated={topRated}
      nasLibrary={nasLibrary}
    />
  );
}
