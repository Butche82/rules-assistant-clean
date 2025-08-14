// lib/pdf.ts
import { createRequire } from "module";

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

// Extract text per page using pdf2json (required at runtime from node_modules)
export async function extractTextByPage(
  input: Buffer | Uint8Array
): Promise<{ page: number; text: string }[]> {
  const buf: Buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  // Force real Node resolution from app root (node_modules)
  const requireNode = createRequire(process.cwd() + "/");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = requireNode("pdf2json");
  const PDFParserCtor = (mod && (mod.PDFParser || mod.default)) || mod;

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParserCtor();
    pdfParser.on("pdfParser_dataError", (err: any) =>
      reject(err?.parserError || err || new Error("pdf2json error"))
    );
    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      const pages = (pdfData?.Pages || []).map((page: any, idx: number) => {
        let text = "";
        const texts = page?.Texts || [];
        for (const t of texts) {
          const runs = t?.R || [];
          for (const r of runs) {
            if (typeof r.T === "string") text += decodeURIComponent(r.T) + " ";
          }
        }
        return { page: idx + 1, text: text.replace(/\s+/g, " ").trim() };
      });
      resolve(pages);
    });
    pdfParser.parseBuffer(buf);
  });
}
