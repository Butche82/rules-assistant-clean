// lib/sources.ts
import * as cheerio from "cheerio";

const USER_AGENT =
  process.env.RA_UA || "RulesAssistantBot/1.0 (+contact: lee)";

// Allow '*' during testing to accept any https host.
// Otherwise a host is allowed if it equals an entry or ends with ".entry".
export const ALLOWLIST = (
  process.env.RA_PUBLISHER_ALLOWLIST ||
  [
    "daysofwonder.com",
    "asmodee.com",
    "asmodee.net",
    "images-cdn.asmodee.com",
    "fantasyflightgames.com",
    "images-cdn.fantasyflightgames.com",
    "stonemaiergames.com",
    "1j1ju.com",
    "en.1j1ju.com",
    "restorationgames.com",
    "z-mangames.com",
    "cmon.com"
  ].join(",")
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isAllowed(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (ALLOWLIST.includes("*")) return true;
    return ALLOWLIST.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// ---- BGG collection (optionally include expansions) ----
export async function fetchBGGCollection(
  username: string,
  includeExpansions = false
): Promise<{ id: string; title: string }[]> {
  const excludes = includeExpansions ? "" : "&excludesubtype=boardgameexpansion";
  const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(
    username
  )}&own=1${excludes}`;

  const r = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!r.ok) return [];
  const xml = await r.text();

  const $ = cheerio.load(xml, { xmlMode: true });
  const items: { id: string; title: string }[] = [];
  $("item").each((_, el) => {
    const id = $(el).attr("objectid") || "";
    const title = $(el).find("name").text() || `BGG-${id}`;
    if (id) items.push({ id, title });
  });
  return items;
}

// ---- Web discovery via DuckDuckGo (decode redirect to real PDF URL) ----
const RULE_PDF = /\.pdf(\?|#|$)/i;

export async function discoverRulebookLinks(gameTitle: string): Promise<string[]> {
  const q = encodeURIComponent(`${gameTitle} official rulebook pdf`);
  const url = `https://duckduckgo.com/html/?q=${q}`;

  const r = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!r.ok) return [];

  const html = await r.text();
  const $ = cheerio.load(html);

  const out: string[] = [];
  $("a.result__a").each((_, a) => {
    const href = ($(a).attr("href") || "").trim();
    if (!href) return;

    // DuckDuckGo often returns /l/?uddg=<encoded target>
    let target = href;
    if (href.startsWith("/l/?")) {
      try {
        const abs = new URL(href, "https://duckduckgo.com");
        const uddg = abs.searchParams.get("uddg");
        if (uddg) target = decodeURIComponent(uddg);
      } catch {
        return;
      }
    }

    if (!/^https?:/i.test(target)) return;
    if (!RULE_PDF.test(target)) return;
    if (!isAllowed(target)) return;

    const cleaned = target.split("#")[0];
    out.push(cleaned);
  });

  return Array.from(new Set(out)).slice(0, 8);
}
