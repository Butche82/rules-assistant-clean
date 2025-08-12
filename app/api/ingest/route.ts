// app/api/ingest/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { fetchBGGCollection, discoverRulebookLinks } from "../../../lib/sources";
import {
  indexPdfForGame,
  indexPdfBufferForGame,
  resetIndex,
  gamesDb,
} from "../../../lib/vector";

type ModeBody = {
  mode: "web" | "urls" | "drive";
  bggUser?: string;
  urls?: string[];
  folderId?: string;           // optional override for Drive
  includeExpansions?: boolean; // for BGG mode (optional)
  reset?: boolean;             // defaults true
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ModeBody;
    const {
      mode,
      bggUser,
      urls,
      folderId,
      includeExpansions = false,
      reset = true,
    } = body;

    // Reset in-memory index if requested (default true)
    if (reset) {
      resetIndex();
      Object.keys(gamesDb).forEach((k) => delete (gamesDb as any)[k]);
    }

    // ----------------- DRIVE MODE -----------------
    if (mode === "drive") {
      const { listDrivePdfs, downloadDriveFile, guessTitleFromFilename } =
        await import("../../../lib/drive");

      const effectiveFolderId = folderId || process.env.GDRIVE_FOLDER_ID;
      if (!effectiveFolderId) {
        return NextResponse.json(
          { error: "GDRIVE_FOLDER_ID missing" },
          { status: 400 }
        );
      }

      const files = await listDrivePdfs(effectiveFolderId);

      for (const f of files) {
        const { id: gameId, title } = guessTitleFromFilename(f.name || "Unknown");
        if (!gamesDb[gameId]) {
          gamesDb[gameId] = { id: gameId, title, fileCount: 0 };
        }

        const buf = await downloadDriveFile(f.id);
        const ok = await indexPdfBufferForGame(gameId, title, buf); // 3-arg version
        if (ok) gamesDb[gameId].fileCount += 1;
      }

      return NextResponse.json({ ok: true, games: Object.values(gamesDb) });
    }

    // ----------------- WEB (BGG) MODE -----------------
    if (mode === "web") {
      if (!bggUser) {
        return NextResponse.json({ error: "bggUser required" }, { status: 400 });
      }

      const items = await fetchBGGCollection(bggUser, includeExpansions);

      // Prepare entries
      for (const { id, title } of items) {
        if (!gamesDb[id]) gamesDb[id] = { id, title, fileCount: 0 };
      }

      // Discover & index PDFs
      for (const { id, title } of items) {
        const links = await discoverRulebookLinks(title);
        for (const link of links) {
          const added = await indexPdfForGame(id, title, link);
          if (added) gamesDb[id].fileCount += 1;
        }
      }

      return NextResponse.json({ ok: true, games: Object.values(gamesDb) });
    }

    // ----------------- PASTE URLS MODE -----------------
    if (mode === "urls") {
      if (!urls?.length) {
        return NextResponse.json({ error: "urls required" }, { status: 400 });
      }

      for (const u of urls) {
        const title = decodeURIComponent(u.split("/").pop() || "Unknown")
          .replace(/[_-]+/g, " ")
          .replace(/\.pdf$/i, "")
          .trim();
        const id = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        if (!gamesDb[id]) gamesDb[id] = { id, title, fileCount: 0 };
        const added = await indexPdfForGame(id, title, u);
        if (added) gamesDb[id].fileCount += 1;
      }

      return NextResponse.json({ ok: true, games: Object.values(gamesDb) });
    }

    // ----------------- UNKNOWN MODE -----------------
    return NextResponse.json({ error: "unknown mode" }, { status: 400 });
  } catch (e: any) {
    console.error("ingest error:", e);
    return NextResponse.json(
      { error: "ingest_failed", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
