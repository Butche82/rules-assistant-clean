export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const hasKey = !!process.env.GDRIVE_SERVICE_ACCOUNT_JSON;
  const folderId = process.env.GDRIVE_FOLDER_ID || "";
  let canList = false, fileCount = 0, err: string | undefined;

  try {
    if (hasKey && folderId) {
      const { listDrivePdfs } = await import("../../../../lib/drive");
      const files = await listDrivePdfs(folderId);
      canList = true;
      fileCount = files.length;
    }
  } catch (e: any) { err = e?.message || String(e); }

  return NextResponse.json({ hasKey, hasFolderId: !!folderId, canList, fileCount, err });
}
