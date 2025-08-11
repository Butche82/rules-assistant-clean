// app/api/health/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { gamesDb } from "../../../lib/vector";

export async function GET() {
  return NextResponse.json({ ok: true, games: Object.keys(gamesDb).length });
}
