import { searchMedia } from "@/lib/tmdb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || searchParams.get("q") || "";
    const pageParam = searchParams.get("page");
    const typeParam = searchParams.get("type"); // "movie" | "tv" | "all"
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
    const type = typeParam === "movie" || typeParam === "tv" ? typeParam : "all";

    if (!query.trim()) {
      return NextResponse.json({
        results: [],
        totalResults: 0,
        totalPages: 0,
        page: 1,
      });
    }

    const data = await searchMedia(query, page, type);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API Search Error:", error);
    return NextResponse.json(
      {
        error: "Errore durante la ricerca",
        details: error?.message,
        results: [],
        totalResults: 0,
        totalPages: 0,
        page: 1,
      },
      { status: 500 }
    );
  }
}
