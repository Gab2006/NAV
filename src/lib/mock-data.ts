import { MediaDetail, MediaItem } from "@/types/media";

export const MOCK_HERO: MediaDetail = {
  id: 693134,
  title: "Dune: Parte Due",
  originalTitle: "Dune: Part Two",
  overview: "Paul Atreides si unisce a Chani e ai Fremen mentre trama vendetta contro i cospiratori che hanno distrutto la sua famiglia. Di fronte alla scelta tra l'amore della sua vita e il destino dell'universo conosciuto, si sforza di prevenire un futuro terribile che solo lui può prevedere.",
  posterPath: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
  backdropPath: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80",
  mediaType: "movie",
  releaseDate: "2024-02-27",
  voteAverage: 8.5,
  voteCount: 4890,
  genres: ["Fantascienza", "Avventura", "Dramma"],
  runtime: 166,
  tagline: "Lunga vita ai guerrieri.",
  trailerKey: "Way9Dexny3w",
  status: "Released",
  downloadStatus: "unrequested",
  cast: [
    { id: 1190668, name: "Timothée Chalamet", character: "Paul Atreides", profilePath: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80" },
    { id: 505710, name: "Zendaya", character: "Chani", profilePath: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" },
    { id: 935, name: "Rebecca Ferguson", character: "Lady Jessica", profilePath: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80" },
    { id: 74212, name: "Austin Butler", character: "Feyd-Rautha", profilePath: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80" }
  ]
};

export const MOCK_TRENDING: MediaItem[] = [
  {
    id: 693134,
    title: "Dune: Parte Due",
    overview: "Paul Atreides intraprende un viaggio di vendetta e redenzione su Arrakis a fianco dei Fremen.",
    posterPath: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80",
    mediaType: "movie",
    releaseDate: "2024-02-27",
    voteAverage: 8.5,
    genres: ["Fantascienza", "Avventura"]
  },
  {
    id: 94605,
    title: "Arcane",
    overview: "Le tensioni tra la ricca città utopica di Piltover e i bassifondi sotterranei di Zaun esplodono con la nascita di nuove tecnologie magiche.",
    posterPath: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1920&q=80",
    mediaType: "tv",
    releaseDate: "2021-11-06",
    voteAverage: 9.0,
    genres: ["Animazione", "Sci-Fi", "Azione"]
  },
  {
    id: 872585,
    title: "Oppenheimer",
    overview: "La storia del fisico J. Robert Oppenheimer e del suo ruolo fondamentale nello sviluppo della prima bomba atomica nel Progetto Manhattan.",
    posterPath: "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1920&q=80",
    mediaType: "movie",
    releaseDate: "2023-07-19",
    voteAverage: 8.3,
    genres: ["Dramma", "Storia"]
  },
  {
    id: 126308,
    title: "Shōgun",
    overview: "Nel Giappone feudale del XVII secolo, Lord Yoshii Toranaga combatte per la sopravvivenza mentre i suoi nemici del Consiglio dei Reggenti tramano contro di lui.",
    posterPath: "https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=1920&q=80",
    mediaType: "tv",
    releaseDate: "2024-02-27",
    voteAverage: 8.7,
    genres: ["Dramma", "Guerra & Storia"]
  },
  {
    id: 100088,
    title: "The Last of Us",
    overview: "Vent'anni dopo la distruzione della civiltà moderna, un contrabbandiere cinico deve scortare una ragazza di quattordici anni attraverso gli Stati Uniti devastati.",
    posterPath: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80",
    mediaType: "tv",
    releaseDate: "2023-01-15",
    voteAverage: 8.6,
    genres: ["Dramma", "Fantascienza"]
  },
  {
    id: 558449,
    title: "Il Gladiatore II",
    overview: "Anni dopo aver assistito alla morte del venerato eroe Massimo per mano dello zio, Lucio deve entrare nel Colosseo per riscattare l'onore di Roma.",
    posterPath: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1920&q=80",
    mediaType: "movie",
    releaseDate: "2024-11-13",
    voteAverage: 7.5,
    genres: ["Azione", "Dramma", "Epico"]
  },
  {
    id: 66732,
    title: "Stranger Things",
    overview: "Quando un bambino scompare, una piccola cittadina dell'Indiana scopre un mistero che coinvolge esperimenti governativi segreti e forze soprannaturali.",
    posterPath: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1920&q=80",
    mediaType: "tv",
    releaseDate: "2016-07-15",
    voteAverage: 8.6,
    genres: ["Fantascienza", "Mistero"]
  }
];

export const MOCK_MOVIES: MediaItem[] = [
  {
    id: 157336,
    title: "Interstellar",
    overview: "Un gruppo di esploratori si avventura attraverso un wormhole nello spazio nel tentativo di garantire la sopravvivenza dell'umanità.",
    posterPath: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80",
    mediaType: "movie",
    releaseDate: "2014-11-05",
    voteAverage: 8.6,
    genres: ["Fantascienza", "Dramma"]
  },
  {
    id: 27205,
    title: "Inception",
    overview: "Un ladro esperto nell'estrarre informazioni preziose dai sogni delle persone riceve l'incarico inverso: impiantare un'idea nella mente di un erede industriale.",
    posterPath: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80",
    mediaType: "movie",
    releaseDate: "2010-07-15",
    voteAverage: 8.4,
    genres: ["Azione", "Fantascienza"]
  },
  {
    id: 335984,
    title: "Blade Runner 2049",
    overview: "Trent'anni dopo gli eventi del primo film, un nuovo blade runner scopre un segreto sepolto da tempo che potrebbe far precipitare la società nel caos totale.",
    posterPath: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1920&q=80",
    mediaType: "movie",
    releaseDate: "2017-10-04",
    voteAverage: 8.1,
    genres: ["Fantascienza", "Cyberpunk"]
  },
  {
    id: 569094,
    title: "Spider-Man: Across the Spider-Verse",
    overview: "Miles Morales viene catapultato nel Multiverso, dove incontra una squadra di Spider-Heroes incaricata di proteggerne l'esistenza stessa.",
    posterPath: "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=1920&q=80",
    mediaType: "movie",
    releaseDate: "2023-05-31",
    voteAverage: 8.5,
    genres: ["Animazione", "Azione"]
  },
  {
    id: 155,
    title: "Il Cavaliere Oscuro",
    overview: "Batman, il tenente Gordon e Harvey Dent affrontano la terrificante anarchia scatenata dalla mente criminale del Joker.",
    posterPath: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80",
    mediaType: "movie",
    releaseDate: "2008-07-16",
    voteAverage: 9.0,
    genres: ["Azione", "Crime", "Dramma"]
  }
];

export const MOCK_TV_SHOWS: MediaItem[] = [
  {
    id: 1399,
    title: "Il Trono di Spade",
    overview: "Sette casate nobiliari si contendono il dominio sulle terre mitiche di Westeros, mentre un antico nemico dormiente si risveglia oltre la barriera.",
    posterPath: "https://images.unsplash.com/photo-1533158307587-828f0a76ef46?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1533158307587-828f0a76ef46?auto=format&fit=crop&w=1920&q=80",
    mediaType: "tv",
    releaseDate: "2011-04-17",
    voteAverage: 8.4,
    genres: ["Fantasy", "Dramma"]
  },
  {
    id: 1396,
    title: "Breaking Bad",
    overview: "Un insegnante di chimica scopre di avere un cancro incurabile ai polmoni e decide di produrre metanfetamina per provvedere al futuro della famiglia.",
    posterPath: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1920&q=80",
    mediaType: "tv",
    releaseDate: "2008-01-20",
    voteAverage: 8.9,
    genres: ["Dramma", "Crime"]
  },
  {
    id: 93405,
    title: "Squid Game",
    overview: "Centinaia di persone con disperati problemi economici accettano un invito enigmatico a competere in giochi per bambini con posta in gioco letale.",
    posterPath: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1920&q=80",
    mediaType: "tv",
    releaseDate: "2021-09-17",
    voteAverage: 7.9,
    genres: ["Thriller", "Dramma"]
  },
  {
    id: 114472,
    title: "Severance (Scissione)",
    overview: "Mark guida un team di colleghi i cui ricordi sono stati chirurgicamente separati tra la loro vita professionale e personale.",
    posterPath: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    backdropPath: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80",
    mediaType: "tv",
    releaseDate: "2022-02-17",
    voteAverage: 8.4,
    genres: ["Fantascienza", "Mistero"]
  }
];

export const MOCK_NEW_RELEASES: MediaItem[] = [
  ...MOCK_TRENDING.slice(0, 4),
  ...MOCK_MOVIES.slice(0, 3)
];

export const MOCK_TOP_RATED: MediaItem[] = [
  ...MOCK_TV_SHOWS.slice(1, 3),
  ...MOCK_MOVIES.slice(0, 3),
  ...MOCK_TRENDING.slice(1, 3)
];
