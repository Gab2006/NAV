import { DownloadRequestPayload, DownloadStatus, MediaItem, MediaStatusResponse, MediaType, NasDiskSpace } from "@/types/media";

// In-memory store for session demo / fallback when NAS is not connected
const mockDownloadStates = new Map<number, {
  status: DownloadStatus;
  progress: number;
  mediaType: MediaType;
  title: string;
  updatedAt: string;
}>();

// Pre-populate a couple of demo states so user can immediately see different statuses
mockDownloadStates.set(157336, { // Interstellar
  status: 'available',
  progress: 100,
  mediaType: 'movie',
  title: 'Interstellar',
  updatedAt: new Date().toISOString()
});
mockDownloadStates.set(94605, { // Arcane
  status: 'downloading',
  progress: 68,
  mediaType: 'tv',
  title: 'Arcane',
  updatedAt: new Date().toISOString()
});

export async function requestDownload(payload: DownloadRequestPayload): Promise<MediaStatusResponse> {
  const { tmdbId, mediaType, title } = payload;
  const isMovie = mediaType === 'movie';
  const service = isMovie ? 'radarr' : 'sonarr';

  const radarrUrl = process.env.RADARR_URL;
  const radarrApiKey = process.env.RADARR_API_KEY;
  const sonarrUrl = process.env.SONARR_URL;
  const sonarrApiKey = process.env.SONARR_API_KEY;

  const targetUrl = isMovie ? radarrUrl : sonarrUrl;
  const apiKey = isMovie ? radarrApiKey : sonarrApiKey;

  // Real NAS forward if configured
  if (targetUrl && apiKey) {
    try {
      const endpoint = isMovie
        ? `${targetUrl}/api/v3/movie`
        : `${targetUrl}/api/v3/series`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({
          title,
          tmdbId,
          monitored: true,
          addOptions: {
            searchForMovie: isMovie,
            searchForMissingEpisodes: !isMovie,
          },
        }),
      });

      if (response.ok) {
        mockDownloadStates.set(tmdbId, {
          status: 'queued',
          progress: 5,
          mediaType,
          title,
          updatedAt: new Date().toISOString(),
        });

        return {
          tmdbId,
          mediaType,
          title,
          status: 'queued',
          progress: 5,
          service,
          quality: '1080p Web-DL',
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn("NAS connection failed, falling back to mock response", err);
    }
  }

  // Fallback simulator
  mockDownloadStates.set(tmdbId, {
    status: 'downloading',
    progress: 15,
    mediaType,
    title,
    updatedAt: new Date().toISOString(),
  });

  return {
    tmdbId,
    mediaType,
    title,
    status: 'downloading',
    progress: 15,
    service,
    quality: '1080p / 4K REMUX',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Queries Radarr or Sonarr directly to check if a media item exists and its real status.
 * Returns null if the NAS is not configured or unreachable.
 */
export async function checkMediaExistsOnNas(
  tmdbId: number,
  mediaType: MediaType
): Promise<{ found: boolean; hasFile: boolean; status: DownloadStatus; progress: number; title: string } | null> {
  const isMovie = mediaType === 'movie';
  const targetUrl = isMovie ? process.env.RADARR_URL : process.env.SONARR_URL;
  const apiKey = isMovie ? process.env.RADARR_API_KEY : process.env.SONARR_API_KEY;

  if (!targetUrl || !apiKey) return null;

  try {
    if (isMovie) {
      // Radarr: GET /api/v3/movie?tmdbId=<id>
      const res = await fetch(`${targetUrl}/api/v3/movie?tmdbId=${tmdbId}`, {
        headers: { 'X-Api-Key': apiKey },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      const movies = await res.json();
      const movie = Array.isArray(movies) ? movies[0] : movies;
      if (!movie || !movie.id) return { found: false, hasFile: false, status: 'unrequested', progress: 0, title: '' };

      const hasFile = movie.hasFile === true;
      const isMonitored = movie.monitored === true;

      // Check active downloads in queue
      let downloadProgress = 0;
      let isDownloading = false;
      try {
        const queueRes = await fetch(`${targetUrl}/api/v3/queue?movieId=${movie.id}`, {
          headers: { 'X-Api-Key': apiKey },
          signal: AbortSignal.timeout(2000),
        });
        if (queueRes.ok) {
          const queue = await queueRes.json();
          const records = queue.records || queue;
          if (Array.isArray(records) && records.length > 0) {
            const record = records[0];
            const sizeleft = record.sizeleft ?? 0;
            const size = record.size ?? 0;
            downloadProgress = size > 0 ? Math.round(((size - sizeleft) / size) * 100) : 5;
            isDownloading = true;
          }
        }
      } catch { /* queue check optional */ }

      const status: DownloadStatus = hasFile ? 'available' : isDownloading ? 'downloading' : isMonitored ? 'queued' : 'unrequested';
      return { found: true, hasFile, status, progress: hasFile ? 100 : downloadProgress, title: movie.title || '' };

    } else {
      // Sonarr: GET /api/v3/series?tmdbId=<id>
      const res = await fetch(`${targetUrl}/api/v3/series?tmdbId=${tmdbId}`, {
        headers: { 'X-Api-Key': apiKey },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      const allSeries = await res.json();
      const series = Array.isArray(allSeries) ? allSeries[0] : allSeries;
      if (!series || !series.id) return { found: false, hasFile: false, status: 'unrequested', progress: 0, title: '' };

      const episodeFileCount = series.episodeFileCount ?? 0;
      const episodeCount = series.episodeCount ?? 0;
      const hasFile = episodeFileCount > 0;
      const isMonitored = series.monitored === true;

      // Check active downloads in queue
      let downloadProgress = 0;
      let isDownloading = false;
      try {
        const queueRes = await fetch(`${targetUrl}/api/v3/queue?seriesId=${series.id}`, {
          headers: { 'X-Api-Key': apiKey },
          signal: AbortSignal.timeout(2000),
        });
        if (queueRes.ok) {
          const queue = await queueRes.json();
          const records = queue.records || queue;
          if (Array.isArray(records) && records.length > 0) {
            const record = records[0];
            const sizeleft = record.sizeleft ?? 0;
            const size = record.size ?? 0;
            downloadProgress = size > 0 ? Math.round(((size - sizeleft) / size) * 100) : 5;
            isDownloading = true;
          }
        }
      } catch { /* queue check optional */ }

      const status: DownloadStatus = isDownloading
        ? 'downloading'
        : hasFile
        ? 'available'
        : isMonitored
        ? 'queued'
        : 'unrequested';

      const progress = episodeCount > 0 ? Math.round((episodeFileCount / episodeCount) * 100) : downloadProgress;
      return { found: true, hasFile, status, progress, title: series.title || '' };
    }
  } catch {
    return null;
  }
}

export async function getMediaStatus(tmdbId: number, mediaType: MediaType = 'movie'): Promise<MediaStatusResponse> {
  const service = mediaType === 'movie' ? 'radarr' : 'sonarr';

  // 1. Try real NAS check first
  const nasResult = await checkMediaExistsOnNas(tmdbId, mediaType);
  if (nasResult !== null) {
    // Update in-memory cache with real data
    if (nasResult.found) {
      mockDownloadStates.set(tmdbId, {
        status: nasResult.status,
        progress: nasResult.progress,
        mediaType,
        title: nasResult.title,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Present in NAS config but not found: keep mock state if any, else unrequested
      const existing = mockDownloadStates.get(tmdbId);
      if (!existing) {
        return { tmdbId, mediaType, title: '', status: 'unrequested', progress: 0, service, lastUpdated: new Date().toISOString() };
      }
    }
    const state = mockDownloadStates.get(tmdbId);
    if (state) {
      return { tmdbId, mediaType: state.mediaType, title: state.title, status: state.status, progress: state.progress, service, quality: '1080p / 4K', lastUpdated: state.updatedAt };
    }
  }

  // 2. Fallback to in-memory mock state
  const existing = mockDownloadStates.get(tmdbId);
  if (existing) {
    if (existing.status === 'downloading' && existing.progress < 100) {
      existing.progress = Math.min(100, existing.progress + 15);
      if (existing.progress >= 100) existing.status = 'available';
    }
    return { tmdbId, mediaType: existing.mediaType, title: existing.title, status: existing.status, progress: existing.progress, service, quality: '1080p / 4K', lastUpdated: existing.updatedAt };
  }

  return { tmdbId, mediaType, title: '', status: 'unrequested', progress: 0, service, lastUpdated: new Date().toISOString() };
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export async function getNasDiskSpace(): Promise<NasDiskSpace> {
  const radarrUrl = process.env.RADARR_URL;
  const radarrApiKey = process.env.RADARR_API_KEY;
  const sonarrUrl = process.env.SONARR_URL;
  const sonarrApiKey = process.env.SONARR_API_KEY;

  const targetUrl = radarrUrl || sonarrUrl;
  const apiKey = radarrApiKey || sonarrApiKey;

  if (targetUrl && apiKey) {
    try {
      const response = await fetch(`${targetUrl}/api/v3/diskspace`, {
        headers: { "X-Api-Key": apiKey },
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        const disks = await response.json();
        if (Array.isArray(disks) && disks.length > 0) {
          const primaryDisk = disks.reduce((prev: any, curr: any) =>
            (curr.totalSpace || 0) > (prev.totalSpace || 0) ? curr : prev
          , disks[0]);

          const totalBytes = Number(primaryDisk.totalSpace || 0);
          const freeBytes = Number(primaryDisk.freeSpace || 0);
          const usedBytes = Math.max(0, totalBytes - freeBytes);
          const percentUsed =
            totalBytes > 0
              ? Math.min(100, Math.round((usedBytes / totalBytes) * 100))
              : 0;

          return {
            total: formatBytes(totalBytes),
            free: formatBytes(freeBytes),
            used: formatBytes(usedBytes),
            percentUsed,
            rawTotalBytes: totalBytes,
            rawFreeBytes: freeBytes,
            rawUsedBytes: usedBytes,
            label: primaryDisk.label || primaryDisk.path || "NAS Storage",
            isReal: true,
          };
        }
      }
    } catch {
      // NAS offline or unreachable
    }
  }

  const fallbackTotal = 4000000000000;
  const fallbackFree = 1400000000000;
  const fallbackUsed = fallbackTotal - fallbackFree;
  return {
    total: "4.0 TB",
    free: "1.4 TB",
    used: "2.6 TB",
    percentUsed: 65,
    rawTotalBytes: fallbackTotal,
    rawFreeBytes: fallbackFree,
    rawUsedBytes: fallbackUsed,
    label: "NAS Storage",
    isReal: false,
  };
}

export async function getNasLibraryMedia(): Promise<MediaItem[]> {
  const radarrUrl = process.env.RADARR_URL;
  const radarrApiKey = process.env.RADARR_API_KEY;
  const sonarrUrl = process.env.SONARR_URL;
  const sonarrApiKey = process.env.SONARR_API_KEY;

  const items: MediaItem[] = [];
  let isNasConnected = false;

  // Fetch Radarr movies
  if (radarrUrl && radarrApiKey) {
    try {
      const res = await fetch(`${radarrUrl}/api/v3/movie`, {
        headers: { "X-Api-Key": radarrApiKey },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        isNasConnected = true;
        const movies = await res.json();
        if (Array.isArray(movies)) {
          movies.forEach((m: any) => {
            // Include SOLO i film effettivamente scaricati e salvati sul disco NAS
            const isDownloaded =
              m.hasFile === true || (typeof m.movieFileId === "number" && m.movieFileId > 0);
            if (!isDownloaded) {
              return;
            }

            const poster =
              m.images?.find((img: any) => img.coverType === "poster")?.remoteUrl ||
              m.images?.find((img: any) => img.coverType === "poster")?.url;
            const backdrop =
              m.images?.find((img: any) => img.coverType === "fanart")?.remoteUrl ||
              m.images?.find((img: any) => img.coverType === "fanart")?.url;

            items.push({
              id: m.tmdbId || m.id,
              title: m.title || "Film",
              originalTitle: m.originalTitle || m.title,
              overview:
                m.overview ||
                "Titolo presente nella tua libreria Radarr sul server NAS.",
              posterPath: poster || null,
              backdropPath: backdrop || null,
              mediaType: "movie",
              releaseDate: m.year ? `${m.year}-01-01` : "",
              voteAverage: Number(
                (m.ratings?.imdb?.value || m.ratings?.tmdb?.value || 8.0).toFixed(1)
              ),
              voteCount: m.ratings?.imdb?.votes || 100,
              genreIds: m.genres || [],
              popularity: 100,
              downloadStatus: "available",
              downloadProgress: 100,
            });
          });
        }
      }
    } catch (e) {
      console.warn("Radarr library fetch error:", e);
    }
  }

  // Fetch Sonarr series
  if (sonarrUrl && sonarrApiKey) {
    try {
      const res = await fetch(`${sonarrUrl}/api/v3/series`, {
        headers: { "X-Api-Key": sonarrApiKey },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        isNasConnected = true;
        const series = await res.json();
        if (Array.isArray(series)) {
          series.forEach((s: any) => {
            // Include SOLO le serie TV con episodi effettivamente scaricati sul disco NAS
            const episodeFileCount =
              s.statistics?.episodeFileCount ?? s.episodeFileCount ?? 0;
            const hasDownloadedFiles =
              episodeFileCount > 0 || (s.statistics?.sizeOnDisk && s.statistics.sizeOnDisk > 0);
            if (!hasDownloadedFiles) {
              return;
            }

            const poster =
              s.images?.find((img: any) => img.coverType === "poster")?.remoteUrl ||
              s.images?.find((img: any) => img.coverType === "poster")?.url;
            const backdrop =
              s.images?.find((img: any) => img.coverType === "fanart")?.remoteUrl ||
              s.images?.find((img: any) => img.coverType === "fanart")?.url;

            items.push({
              id: s.tmdbId || s.tvdbId || s.id,
              title: s.title || "Serie TV",
              originalTitle: s.originalTitle || s.title,
              overview:
                s.overview ||
                "Serie TV presente nella tua libreria Sonarr sul server NAS.",
              posterPath: poster || null,
              backdropPath: backdrop || null,
              mediaType: "tv",
              releaseDate: s.year ? `${s.year}-01-01` : "",
              voteAverage: Number((s.ratings?.value || 8.5).toFixed(1)),
              voteCount: s.ratings?.votes || 100,
              genreIds: s.genres || [],
              popularity: 100,
              downloadStatus: "available",
              downloadProgress: 100,
            });
          });
        }
      }
    } catch (e) {
      console.warn("Sonarr library fetch error:", e);
    }
  }

  // Fallback demo items solo quando il server NAS è offline o non raggiungibile (per GEMINI.md)
  if (items.length === 0 && !isNasConnected) {
    return [
      {
        id: 157336,
        title: "Interstellar",
        originalTitle: "Interstellar",
        overview: "Un gruppo di esploratori intraprende il viaggio più importante della storia dell'umanità per salvare il genere umano attraverso un tunnel spaziale.",
        posterPath: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80",
        backdropPath: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80",
        mediaType: "movie",
        releaseDate: "2014-11-05",
        voteAverage: 8.7,
        voteCount: 35000,
        popularity: 95,
        downloadStatus: "available",
        downloadProgress: 100,
      },
      {
        id: 94605,
        title: "Arcane",
        originalTitle: "Arcane",
        overview: "Le tensioni tra la ricca città utopica di Piltover e i bassifondi sotterranei di Zaun esplodono con la nascita di nuove tecnologie magiche.",
        posterPath: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80",
        backdropPath: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1920&q=80",
        mediaType: "tv",
        releaseDate: "2021-11-06",
        voteAverage: 9.0,
        voteCount: 4200,
        popularity: 98,
        downloadStatus: "available",
        downloadProgress: 100,
      },
    ];
  }

  return items;
}
