import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Questo valore viene impostato all'avvio del server Node.js.
// Ogni volta che il container Docker o il processo Node viene riavviato (es. un aggiornamento),
// questa variabile cambierà.
const serverStartTime = Date.now().toString();

export async function GET() {
  return NextResponse.json({ version: serverStartTime });
}
