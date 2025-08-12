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
        if (!gamesDb[gameId]) gamesDb[gameId] = { id: gameId, title, fileCount: 0 };

        const buf = await downloadDriveFile(f.id);
        const ok = await indexPdfBufferForGame(gameId, title, buf); // 3-arg version
        if (ok) ga
