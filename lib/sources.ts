// lib/sources.ts
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

// add includeExpansions param
export async function fetchBGGCollection(username: string, includeExpansions = false): Promise<{id: string, title: string}[]> {
  const excludes = includeExpansions ? "" : "&excludesubtype=boardgameexpansion";
  const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1${excludes}`;
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
