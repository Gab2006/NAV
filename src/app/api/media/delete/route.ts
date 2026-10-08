import { deleteMediaFromNas } from "@/lib/nas-service";
import { MediaType } from "@/types/media";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tmdbId = body.tmdbId || body.id;
    const mediaType = (body.type || body.mediaType || "movie") as MediaType;

    if (!tmdbId) {
      return NextResponse.json(
        { error: "Parametro tmdbId richiesto per l'eliminazione" },
        { status: 400 }
      );
    }

    const result = await deleteMediaFromNas(Number(tmdbId), mediaType);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Errore POST /api/media/delete:", error);
    return NextResponse.json(
      { error: "Errore durante l'eliminazione dal NAS", details: error?.message },
      { status: 500 }
    );
  }
}
