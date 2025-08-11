export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { gamesDb } from "../../../lib/vector";

export async function GET() {
  const games = Object.values(gamesDb).sort((a,b)=>a.title.localeCompare(b.title));
  return NextResponse.json({ games });
}
