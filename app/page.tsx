// Path: app/page.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// ---- Types ----
interface GameMeta {
  id: string;
  title: string;
  year?: number;
  designers?: string[];
  fileCount: number;
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ gameId: string; page: number; snippet: string }>;
}

// ---- Helper: basic JSON fetch ----
async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function Page() {
  // Source controls
  const [sourceMode, setSourceMode] = useState<"web" | "urls">("web");
  const [bggUser, setBggUser] = useState("Butcha82");
  const [urlList, setUrlList] = useState("");

  // Games & chat
  const [games, setGames] = useState<GameMeta[]>([]);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [chat, setChat] = useState<ChatTurn[]>([]);

  // UI state
  const [syncing, setSyncing] = useState(false);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [showPanel, setShowPanel] = useState(false); // mobile left-rail toggle

  // Answer mode
  const [strictMode, setStrictMode] = useState(false); // false = allow normal answers
  const [allowInterp, setAllowInterp] = useState(true); // permit advisory interpretations

  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollToEnd = () => endRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToEnd, [chat, loadingAnswer]);

  const loadGames = async () => {
    try {
      const data = await api("/api/games");
      setGames(data.games || []);
    } catch {
      setGames([]);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const toggleGame = (id: string) => {
    setSelectedGames((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const body: any = { mode: sourceMode };
      if (sourceMode === "web") body.bggUser = bggUser;
      if (sourceMode === "urls") body.urls = urlList.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      await api("/api/ingest", { method: "POST", body: JSON.stringify(body) });
      await loadGames();
    } catch (e: any) {
      alert("Sync failed: " + (e?.message || e));
    } finally {
      setSyncing(false);
    }
  };

  const ask = async () => {
    if (!q.trim()) return;
    const userTurn: ChatTurn = { role: "user", content: q };
    setChat((c) => [...c, userTurn]);
    setQ("");
    setLoadingAnswer(true);
    try {
      const data = await api("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          query: userTurn.content,
          gameFilter: selectedGames,
          strict: strictMode,
          allowInterpretation: allowInterp,
        }),
      });
      const assistantTurn: ChatTurn = {
        role: "assistant",
        content: data.answer || "(No answer returned)",
        citations: data.citations || [],
      };
      setChat((c) => [...c, assistantTurn]);
    } catch (e: any) {
      setChat((c) => [
        ...c,
        { role: "assistant", content: "Error contacting /api/chat: " + (e?.message || e) },
      ]);
    } finally {
      setLoadingAnswer(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6">
      {/* Top bar */}
      <div className="mx-auto max-w-7xl mb-4 flex items-center justify-between">
        <div className="text-lg sm:text-xl font-semibold tracking-tight">Rules Assistant</div>
        <div className="lg:hidden">
          <button onClick={() => setShowPanel((v) => !v)} className="rounded-full border px-3 py-1.5 text-sm">
            {showPanel ? "Hide" : "Browse Games"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
        {/* Left rail */}
        <div className={`space-y-6 ${showPanel ? "block" : "hidden"} lg:block`}>
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="p-4 border-b">
              <div className="text-base font-semibold">Data Source</div>
              <div className="text-sm text-slate-600 mt-1">Auto-pull public rulebooks via BGG collection or paste URLs directly.</div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSourceMode("web")} className={`px-3 py-1.5 rounded-full border ${sourceMode === "web" ? "bg-slate-900 text-white border-slate-900" : "bg-white"}`}>Web (auto)</button>
                <button onClick={() => setSourceMode("urls")} className={`px-3 py-1.5 rounded-full border ${sourceMode === "urls" ? "bg-slate-900 text-white border-slate-900" : "bg-white"}`}>Paste URLs</button>
              </div>

              {sourceMode === "web" && (
                <div className="space-y-2">
                  <label className="block text-sm text-slate-600">BGG Username</label>
                  <input value={bggUser} onChange={(e) => setBggUser(e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="Your BGG username" />
                </div>
              )}

              {sourceMode === "urls" && (
                <div className="space-y-2">
                  <label className="block text-sm text-slate-600">URLs (one per line)</label>
                  <textarea value={urlList} onChange={(e) => setUrlList(e.target.value)} className="w-full min-h-[120px] rounded-xl border px-3 py-2" placeholder="https://publisher.com/game/rulebook.pdf\nhttps://…" />
                </div>
              )}

              <button onClick={sync} disabled={syncing || (sourceMode === "web" && !bggUser)} className="rounded-xl border px-3 py-2 text-sm bg-slate-900 text-white disabled:opacity-50">
                {syncing ? (<span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Syncing…</span>) : "Sync"}
              </button>

              <div className="text-xs text-slate-500">We only index public, permissible files from trusted publishers.</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="p-4 border-b"><div className="text-base font-semibold">Your Games</div></div>
            <div className="p-4 grid gap-2">
              {games.length === 0 && (
                <div className="text-sm text-slate-500">No games indexed yet. Hit <strong>Sync</strong> above.</div>
              )}
              {games.map((g) => {
                const active = selectedGames.includes(g.id);
                return (
                  <button key={g.id} onClick={() => toggleGame(g.id)} className={`text-left rounded-2xl border p-3 hover:shadow transition ${active ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{g.title}</div>
                      <span className={`text-xs rounded-full px-2 py-0.5 border ${active ? "bg-white text-slate-900" : "bg-slate-50"}`}>{g.fileCount} PDF</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chat panel */}
        <div className="rounded-2xl border bg-white shadow-sm flex flex-col h-[calc(100vh-160px)] sm:h-[calc(100vh-140px)]">
          <div className="p-4 border-b">
            <div className="text-lg font-semibold">Board Game Rules Assistant</div>
            <div className="text-sm text-slate-600">Ask rules questions; answers include citations when available.</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chat.length === 0 && (
              <div className="text-slate-500 text-sm">Try: <em>"In Ticket to Ride Europe, can I build a station after someone blocks a route?"</em></div>
            )}
            {chat.map((t, idx) => (
              <div key={idx} className={`rounded-2xl p-3 border ${t.role === "user" ? "bg-white" : "bg-slate-50"}`}>
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{t.role === "user" ? "You" : "Assistant"}</div>
                <div className="whitespace-pre-wrap leading-relaxed">{t.content}</div>
                {!!t.citations?.length && (
                  <div className="mt-2 space-y-2">
                    <div className="text-xs font-semibold text-slate-600">Sources</div>
                    <div className="grid gap-2">
                      {t.citations.map((c, i) => (
                        <div key={i} className="text-xs text-slate-600 rounded-lg border p-2 bg-white">
                          Page {c.page}
                          <div className="text-slate-500 mt-1 italic">“{c.snippet}”</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loadingAnswer && (
              <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="h-4 w-4 animate-spin"/> Thinking…</div>
            )}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div className="p-4 border-t bg-white sticky bottom-0">
            {/* Toggle Bar */}
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600">Answer mode:</span>
              <button
                onClick={() => { setStrictMode(true); setAllowInterp(false); }}
                className={`px-3 py-1.5 rounded-full border ${strictMode && !allowInterp ? "bg-slate-900 text-white border-slate-900" : "bg-white"}`}
                title="Only answer when a citation is available"
              >
                Strict (citations only)
              </button>
              <button
                onClick={() => { setStrictMode(false); setAllowInterp(true); }}
                className={`px-3 py-1.5 rounded-full border ${!strictMode && allowInterp ? "bg-slate-900 text-white border-slate-900" : "bg-white"}`}
                title="Permit advisory interpretations for ambiguous cases"
              >
                Allow interpretations
              </button>
            </div>

            <div className="flex items-end gap-2">
              <textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a rules question…" className="min-h-[56px] sm:min-h-[64px] flex-1 rounded-xl border px-3 py-2" />
              <button onClick={ask} disabled={loadingAnswer || !q.trim()} className="h-[56px] sm:h-[64px] px-4 rounded-xl border bg-slate-900 text-white disabled:opacity-50">Send</button>
            </div>
            <div className="text-xs text-slate-500 mt-2">Shift+Enter = newline</div>
          </div>
        </div>
      </div>
    </div>
  );
}
