import { POST as mediaPost } from "../route";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Normalize properties for both formats
    const normalizedBody = {
      id: body.id || body.tmdbId,
      tmdbId: body.tmdbId || body.id,
      type: body.type || body.mediaType || "movie",
      title: body.title || body.name,
      year: typeof body.year === "string" ? parseInt(body.year.slice(0, 4)) : body.year,
    };

    // Forward to handler
    const simulatedReq = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(normalizedBody),
    });

    return await mediaPost(simulatedReq);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Errore durante l'avvio del download", details: error?.message },
      { status: 500 }
    );
  }
}
