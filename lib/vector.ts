// lib/vector.ts
import { createHash } from "crypto";
import OpenAI from "openai";

export const gamesDb: Record<string, { id: string; title: string; fileCount: number }> = {};

export type Row = {
  game_id: string;
  game_title: string;
  source_url: string; // informational only
  page: number;
  text: string;
  doc_hash: string;
};

let rows: Row[] = [];
let vectors: Float32Array[] = [];

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function chunk(text: string, max = 1000, overlap = 150) {
  const clean = text.replace(/\s+/g, " ").trim();
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    out.push(clean.slice(i, i + max));
    i += Math.max(1, max - overlap);
  }
  return out;
}

async function embed(texts: string[]): Promise<Float32Array[]> {
  if (!process.env.OPENAI_API_KEY) {
    // fallback: pseudo-embeddings so the app still works without a key
    return texts.map((t) => {
      const h = createHash("sha1").update(t).digest();
      const vec = new Float32Array(256);
      for (let i = 0; i < vec.length; i++) vec[i] = (h[i % h.length] - 128) / 128;
      return vec;
    });
  }
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return res.data.map((d) => Float32Array.from(d.embedding));
}

function cosineSim(a: Float32Array, b: Float32Array) {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

export function resetIndex() {
  rows = [];
  vectors = [];
}

export async function indexPdfForGame(gameId: string, title: string, url: string): Promise<boolean> {
  const buf = await fetchPdf(url);
  if (!buf) return false;
  // ⬇️ Call the 3-arg buffer indexer
  return indexPdfBufferForGame(gameId, title, buf);
}

// 3-arg buffer indexer used by both Drive and Web paths
export async function indexPdfBufferForGame(
  gameId: string,
  title: string,
  buf: Buffer
): Promise<boolean> {
  const pages = await extractTextByPage(buf);
  const toEmbed: string[] = [];
  const newRows: Row[] = [];
  const hash = createHash("sha1").update(buf).digest("hex");

  for (const p of pages) {
    const text = (p.text || "").trim();
    if (!text) continue;
    for (const c of chunk(text)) {
      newRows.push({
        game_id: gameId,
        game_title: title,
        source_url: `doc://${hash}`, // generic; we’re indexing from a buffer
        page: p.page,
        text: c,
        doc_hash: hash,
      });
      toEmbed.push(c);
    }
  }

  if (!toEmbed.length) return false;
  const embs = await embed(toEmbed);
  rows.push(...newRows);
  vectors.push(...embs);
  return true;
}

export async function retrieveAndAnswer(opts: {
  query: string;
  gameFilter?: string[];
  strict?: boolean;
  allowInterpretation?: boolean;
}) {
  const { query, gameFilter, strict = true, allowInterpretation = true } = opts;

  if (!rows.length) {
    return { answer: "No rulebooks indexed yet. Hit Sync first.", citations: [] };
  }

  const [qVec] = await embed([query]);

  const scored = rows
    .map((r, i) => ({ i, r, s: cosineSim(qVec, vectors[i]) }))
    .filter((x) => !gameFilter?.length || gameFilter.includes(x.r.game_id))
    .sort((a, b) => b.s - a.s)
    .slice(0, 12);

  if (!scored.length) {
    if (strict) {
      return { answer: "I couldn't find anything relevant in your indexed rulebooks for that query.", citations: [] };
    }
    if (allowInterpretation) {
      return { answer: "No direct cites found; here’s a reasonable ruling based on common patterns in similar games (advisory).", citations: [] };
    }
    return { answer: "No matching sources.", citations: [] };
  }

  const seen = new Set<string>();
  const bullets: string[] = [];
  const citations: { gameId: string; page: number; snippet: string }[] = [];

  for (const x of scored.slice(0, 6)) {
    const k = `${x.r.game_id}-${x.r.page}-${x.r.doc_hash}`;
    if (seen.has(k)) continue;
    seen.add(k);

    const snip = x.r.text.slice(0, 350).trim();
    bullets.push(`• ${x.r.game_title} — p.${x.r.page}: ${snip}`);
    citations.push({ gameId: x.r.game_id, page: x.r.page, snippet: x.r.text.slice(0, 180).trim() });
  }

  let answer = `Based on your indexed rulebooks, here are the most relevant passages (with pages):\n\n${bullets.join("\n")}`;
  if (!strict && allowInterpretation) {
    answer += `\n\nInterpretation: Given these citations, a fair edge-case ruling would be … (advisory).`;
  }

  return { answer, citations };
}
