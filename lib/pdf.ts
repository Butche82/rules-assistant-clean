import pdf from "pdf-parse";

export async function fetchPdf(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length < 1024) return null;
    return buf;
  } catch { return null; }
}

export async function extractTextByPage(buf: Buffer): Promise<{page:number, text:string}[]> {
  const data = await pdf(buf);
  const raw = (data.text || "").replace(/\r/g, "\n");
  const approxPageSize = 2000;
  const chunks: {page:number,text:string}[] = [];
  let i = 0, p = 1;
  while (i < raw.length) { chunks.push({ page: p++, text: raw.slice(i, i + approxPageSize) }); i += approxPageSize - 200; }
  if (!chunks.length) chunks.push({ page: 1, text: raw });
  return chunks;
}
