import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  // Consente l'accesso e il caricamento delle risorse in dev da altri dispositivi nella rete locale
  allowedDevOrigins: [
    "192.168.1.46",
    "192.168.1.46:3000",
    "26.192.206.160",
    "26.192.206.160:3000",
    "100.94.40.62",
    "100.94.40.62:3000",
    "tail4ed52f.ts.net",
    "tail4ed52f.ts.net:3000",
    "*.ts.net",
    "*.ts.net:3000",
    "localhost",
    "localhost:3000",
    "*.local",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "artworks.thetvdb.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
