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

// Extract text per page using pdf-parse (loaded at runtime, not bundled)
export async function extractTextByPage(
  input: Buffer | Uint8Array
): Promise<{ page: number; text: string }[]> {
  const buf: Buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  // Load from node_modules at runtime so Vercel ships it but doesn't bundle it
  const requireNode = createRequire(process.cwd() + "/");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = requireNode("pdf-parse"); // CommonJS function

  const pages: string[] = [];
  const options = {
    pagerender: (pageData: any) => {
      return pageData
        .getTextContent({
          normalizeWhitespace: true,
          disableCombineTextItems: false
        })
        .then((tc: any) => {
          const text = (tc.items || [])
            .map((it: any) => (typeof it.str === "string" ? it.str : ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          pages.push(text);
          // Return value is concatenated by pdf-parse; we still keep our per-page array
          return text + "\n";
        });
    }
  };

  await pdfParse(buf, options);
  return pages.map((text, i) => ({ page: i + 1, text }));
}
