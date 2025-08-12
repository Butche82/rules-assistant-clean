// lib/pdf.ts

// Fetch PDF bytes from a URL
export async function fetchPdf(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length < 1024) return null;
    return buf;
  } catch {
    return null;
  }
}

// Extract text per page using PDF.js (expects Uint8Array)
export async function extractTextByPage(
  input: Buffer | Uint8Array
): Promise<{ page: number; text: string }[]> {
  // If not already Uint8Array, coerce it (works for Buffer too)
  const data: Uint8Array =
    input instanceof Uint8Array ? input : new Uint8Array(input as any);

  // Use legacy build; we stubbed worker/canvas in next.config.js
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.js");
  const doc = await pdfjs.getDocument({ data }).promise;

  const pages: { page: number; text: string }[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = (content.items || []) as any[];
    const text = items
      .map((it: any) => (typeof it.str === "string" ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push({ page: p, text });
  }

  if (typeof (doc as any).destroy === "function") {
    (doc as any).destroy();
  }

  return pages;
}
