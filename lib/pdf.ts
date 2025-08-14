// lib/pdf.ts (only the loader bit changes)

// ...same fetchPdf above...

export async function extractTextByPage(
  input: Buffer | Uint8Array
): Promise<{ page: number; text: string }[]> {
  const buf: Buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  // 👇 static require so Next's output-file-tracing sees it
  // (do NOT move this to the top of the file)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("pdf2json");
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
          for (const r of runs) if (typeof r.T === "string") text += decodeURIComponent(r.T) + " ";
        }
        return { page: idx + 1, text: text.replace(/\s+/g, " ").trim() };
      });
      resolve(pages);
    });
    pdfParser.parseBuffer(buf);
  });
}
