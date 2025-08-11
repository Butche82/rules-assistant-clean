export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { gamesDb } from "../../../lib/vector";

export async function GET() {
  return NextResponse.json({ ok: true, games: Object.keys(gamesDb).length });
}
