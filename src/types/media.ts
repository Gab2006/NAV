export type MediaType = 'movie' | 'tv';

export type DownloadStatus =
  | 'unrequested'
  | 'queued'
  | 'downloading'
  | 'available'
  | 'missing'
  | 'not_available'
  | 'unmonitored';

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface VideoTrailer {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface MediaItem {
  id: number;
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  mediaType: MediaType;
  releaseDate: string;
  voteAverage: number;
  voteCount?: number;
  genres?: string[];
  genreIds?: number[];
  popularity?: number;
  downloadStatus?: DownloadStatus;
  downloadProgress?: number;
  statusLabel?: string;
}

export interface MediaDetail extends MediaItem {
  tagline?: string;
  runtime?: number;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  trailerKey?: string | null;
  cast?: CastMember[];
  status?: string;
  downloadStatus?: DownloadStatus;
  downloadProgress?: number;
  statusLabel?: string;
}

export interface NasDiskSpace {
  total: string;
  free: string;
  used: string;
  percentUsed: number;
  rawTotalBytes: number;
  rawFreeBytes: number;
  rawUsedBytes: number;
  label?: string;
  isReal?: boolean;
}

export interface MediaStatusResponse {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  status: DownloadStatus;
  statusLabel?: string;
  progress: number;
  quality?: string;
  service: 'radarr' | 'sonarr';
  lastUpdated: string;
  diskSpace?: NasDiskSpace;
}

export interface DownloadRequestPayload {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year?: string;
  qualityProfile?: string;
}

export interface IndexerRelease {
  guid: string;
  title: string;
  indexer: string;
  size: number;
  seeders?: number;
  leechers?: number;
  quality: string;
  age?: number; // days
}

export interface IndexerLookupResult {
  available: boolean;
  count: number;
  releases: IndexerRelease[];
  nasConfigured: boolean;
  error?: string;
}
