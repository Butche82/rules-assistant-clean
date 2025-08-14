export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createRequire } from "module";

export async function GET() {
  try {
    const requireNode = createRequire(process.cwd() + "/");
    const path = requireNode.resolve("pdf2json");
    return NextResponse.json({ ok: true, resolved: path });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
