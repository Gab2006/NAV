import { getMediaStatus, getNasDiskSpace } from "@/lib/nas-service";
import { MediaType } from "@/types/media";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tmdbIdParam = searchParams.get("tmdbId");
    const typeParam = (searchParams.get("type") as MediaType) || "movie";

    if (!tmdbIdParam) {
      return NextResponse.json(
        { error: "Parametro tmdbId richiesto" },
        { status: 400 }
      );
    }

    const tmdbId = parseInt(tmdbIdParam, 10);
    if (isNaN(tmdbId)) {
      return NextResponse.json(
        { error: "tmdbId non valido" },
        { status: 400 }
      );
    }

    const status = await getMediaStatus(tmdbId, typeParam);
    const diskSpace = await getNasDiskSpace();
    return NextResponse.json({ ...status, diskSpace });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Errore durante il recupero dello stato", details: error?.message },
      { status: 500 }
    );
  }
}
