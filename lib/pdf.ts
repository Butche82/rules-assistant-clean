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
  if (B && typeof B.isBuffer === "function" && B.isBuffer(anyIn)) {
    return new Uint8Array(anyIn.buffer, anyIn.byteOffset, anyIn.byteLength);
  }
  if (anyIn instanceof Uint8Array) {
    return new Uint8Array(anyIn.buffer, anyIn.byteOffset, anyIn.byteLength);
  }
  return new Uint8Array(anyIn as ArrayBufferLike);
}

// Extract text per page using PDF.js (disable worker in Node)
export async function extractTextByPage(
  input: Buffer | Uint8Array
): Promise<{ page: number; text: string }[]> {
  const data = toUint8Array(input);

  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.js");
  // Force no-worker mode to avoid loading pdf.worker.js in serverless
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = undefined;
  }

  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;

  const pages: { page: number; text: string }[] = [];
  for (let p = 1; p <= d
