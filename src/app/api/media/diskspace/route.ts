import { getNasDiskSpace } from "@/lib/nas-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const diskSpace = await getNasDiskSpace();
    return NextResponse.json(diskSpace);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Errore durante il recupero dello spazio disco", details: error?.message },
      { status: 500 }
    );
  }
}
