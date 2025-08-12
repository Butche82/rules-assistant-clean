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

// Extract text, page-by-page, using PDF.js (no pdf-parse)
export async function extractTextByPage(
  buf: Buffer
): Promise<{ page: number; text: string }[]> {
  // Dynamic import so Next doesn’t try to bundle browser worker
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.js");
  const doc = await pdfjs.getDocument({ data: buf }).promise;

  const pages: { page: number; text: string }[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const text = (content.items as any[])
      .map((it: any) => (typeof it.str === "string" ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ page: p, text });
  }
  if (typeof doc.destroy === "function") doc.destroy();
  return pages;
}
