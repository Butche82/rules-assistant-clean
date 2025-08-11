// app/api/ingest/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { fetchBGGCollection, discoverRulebookLinks } from "../../../lib/sources";
import { indexPdfForGame, resetIndex, gamesDb } from "../../../lib/vector";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    mode,
    bggUser,
    urls,
    includeExpansions = false,
    batchSize = 40,
    cursor = 0,
    reset = cursor === 0
  } = body as {
    mode: "web" | "urls";
    bggUser?: string;
    urls?: string[];
    includeExpansions?: boolean;
    batchSize?: number;
    cursor?: number;   // index into the games list
    reset?: boolean;   // force clear index first call
  };

  if (reset) {
    resetIndex();
    Object.keys(gamesDb).forEach((k) => delete (gamesDb as any)[k]);
  }

  if (mode === "web") {
    if (!bggUser) return NextResponse.json({ error: "bggUser required" }, { status: 400 });

    // Get your collection (base games or base+expansions)
    const items = await fetchBGGCollection(bggUser, includeExpansions);

    // Initialize game entries (only once)
    if (reset) {
      for (const { id, title } of items) gamesDb[id] = { id, title, fileCount: 0 };
    }

    // Process a slice (batch) this call
    const slice = items.slice(cursor, cursor + batchSize);

    for (const { id, title } of slice) {
      const links = await discoverRulebookLinks(title);
      for (const link of links) {
        const added = await indexPdfForGame(id, title, link);
        if (added) gamesDb[id].fileCount += 1;
      }
    }

    const nextCursor = cursor + slice.length;
    const hasMore = nextCursor < items.length;

    return NextResponse.json({
      ok: true,
      processed: slice.length,
      total: items.length,
      cursor: nextCursor,
      hasMore,
      games: Object.values(gamesDb)
    });
  }

  if (mode === "urls") {
    if (!urls?.length) return NextResponse.json({ error: "urls required" }, { status: 400 });
    for (const u of urls) {
      const title = decodeURIComponent(u.split("/").pop() || "Unknown").replace(/[_-]+/g, " ").replace(/\.pdf$/i, "");
      const id = title.toLowerCase().replace(/\s+/g, "-");
      if (!gamesDb[id]) gamesDb[id] = { id, title, fileCount: 0 };
      const added = await indexPdfForGame(id, title, u);
      if (added) gamesDb[id].fileCount += 1;
    }
    return NextResponse.json({ ok: true, games: Object.values(gamesDb) });
  }

  return NextResponse.json({ error: "unknown mode" }, { status: 400 });
}
