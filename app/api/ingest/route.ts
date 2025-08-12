// app/api/ingest/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { fetchBGGCollection, discoverRulebookLinks } from "../../../lib/sources";
import { indexPdfForGame, indexPdfBufferForGame, resetIndex, gamesDb } from "../../../lib/vector";
import { listDrivePdfs, downloadDriveFile, guessTitleFromFilename } from "../../../lib/drive";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mode, bggUser, urls } = body as { mode: "web" | "urls" | "drive"; bggUser?: string; urls?: string[] };

  // fresh run each time for now
  resetIndex();
  Object.keys(gamesDb).forEach((k) => delete (gamesDb as any)[k]);

  if (mode === "drive") {
    const folderId = process.env.GDRIVE_FOLDER_ID;
    if (!folderId) return NextResponse.json({ error: "Missing env GDRIVE_FOLDER_ID" }, { status: 400 });

    const files = await listDrivePdfs(folderId);
    for (const f of files) {
      const { id, title } = guessTitleFromFilename(f.name);
      if (!gamesDb[id]) gamesDb[id] = { id, title, fileCount: 0 };

      const buf = await downloadDriveFile(f.id);
      const ok = await indexPdfBufferForGame(id, title, `gdrive://${f.id}`, buf);
      if (ok) gamesDb[id].fileCount += 1;
    }

    return NextResponse.json({ ok: true, games: Object.values(gamesDb) });
  }

  if (mode === "web") {
    if (!bggUser) return NextResponse.json({ error: "bggUser required" }, { status: 400 });
    const items = await fetchBGGCollection(bggUser);
    for (const { id, title } of items) gamesDb[id] = { id, title, fileCount: 0 };
    for (const { id, title } of items) {
      const links = await discoverRulebookLinks(title);
      for (const link of links) {
        const added = await indexPdfForGame(id, title, link);
        if (added) gamesDb[id].fileCount += 1;
      }
    }
    return NextResponse.json({ ok: true, games: Object.values(gamesDb) });
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
