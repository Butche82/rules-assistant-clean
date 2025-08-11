import * as cheerio from "cheerio";

const USER_AGENT = process.env.RA_UA || "RulesAssistantBot/1.0 (+contact: local)";
export const ALLOWLIST = (process.env.RA_PUBLISHER_ALLOWLIST || [
  "www.daysofwonder.com",
  "assets.daysofwonder.com",
  "images-cdn.asmodee.com",
  "cdn.1j1ju.com",
  "www.stonemaiergames.com",
  "www.fantasyflightgames.com",
].join(",")).split(",").map(s=>s.trim()).filter(Boolean);

export async function fetchBGGCollection(username: string): Promise<{id:string, title:string}[]> {
  const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&excludesubtype=boardgameexpansion`;
  const r = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!r.ok) return [];
  const xml = await r.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: {id:string, title:string}[] = [];
  $("item").each((_, el) => {
    const id = $(el).attr("objectid") || "";
    const title = $(el).find("name").text() || `BGG-${id}`;
    if (id) items.push({ id, title });
  });
  return items;
}

const RULE_PATTERNS = [/rulebook\.pdf$/i, /rules\.pdf$/i, /\brulebook\b.*\.pdf$/i];

function isAllowed(url: string) {
  try {
    const host = new URL(url).host.toLowerCase();
    return ALLOWLIST.some(d => host === d || host.endsWith(`.${d}`));
  } catch { return false; }
}

export async function discoverRulebookLinks(gameTitle: string): Promise<string[]> {
  const q = encodeURIComponent(`${gameTitle} official rulebook pdf`);
  const url = `https://duckduckgo.com/html/?q=${q}`;
  const r = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!r.ok) return [];
  const html = await r.text();
  const $ = cheerio.load(html);
  const out: string[] = [];
  $("a.result__a").each((_, a) => {
    const href = $(a).attr("href") || "";
    if (RULE_PATTERNS.some(rx => rx.test(href)) && isAllowed(href)) out.push(href.split("?")[0]);
  });
  return Array.from(new Set(out)).slice(0, 8);
}
