import { getMediaDetails } from "@/lib/tmdb";
import { MediaType } from "@/types/media";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const typeParam = searchParams.get("type") as MediaType;

    if (!idParam) {
      return NextResponse.json({ error: "ID mancante" }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    const type: MediaType = typeParam === "tv" ? "tv" : "movie";

    const details = await getMediaDetails(id, type);
    return NextResponse.json(details);
  } catch (error: any) {
    console.error("API Details Error:", error);
    return NextResponse.json(
      { error: "Errore durante il recupero dei dettagli", details: error?.message },
      { status: 500 }
    );
  }
}
