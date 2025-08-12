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

// Normalize to a plain Uint8Array (not a Node Buffer)
function toUint8Array(input: Buffer | Uint8Array): Uint8Array {
  const anyIn = input as any;
  const B: any = (globalThis as any).Buffer;

  // If it's a Node Buffer, create a zero-copy Uint8Array view
  if (B && typeof B.isBuffer === "function" && B.isBuffer(anyIn)) {
    return new Uint8Array(anyIn.buffer, anyIn.byteOffset, anyIn.byteLength);
  }

  // If it's already a Uint8Array, return a view (ensures plain typed array)
  if (anyIn instanceof Uint8Array) {
    return new Uint8Array(anyIn.buffer, anyIn.byteOffset, anyIn.byteLength);
  }

  // Last resort: coerce
  return new Uint8Array(anyIn as ArrayBufferLike);
}

// Extract text per page using PDF.js
export async function extractTextByPage(
  input: Buffer | Uint8Array
): Promise<{ page: number; text: string }[]> {
  const data = toUint8Array(input);

  // Use legacy build; worker/canvas are stubbed in next.config.js
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
