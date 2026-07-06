import { useState, useRef, useEffect } from "react";
import { fetchIdea, RateLimitError } from "./api";
import type { Custo, Idea } from "../shared/types";

// ---------------------------------------------------------------
// "Sem Ideia?" — gerador de ideias com IA (Claude por dentro)
// A IA interpreta QUALQUER texto e gera uma ideia nova na hora.
// ---------------------------------------------------------------

const SHUFFLE_EMOJIS = ["🎲", "🍕", "🎬", "✈️", "🎮", "🏖️", "🎸", "🍿", "⚽", "🎨", "🛹", "🌮", "🚀", "🧩", "🎤"];

const QUICK_CHIPS = [
  "tô sem ideia do que fazer hoje",
  "quero sair com meus amigos",
  "não sei o que comer",
  "algo divertido em casa",
  "quero criar um projeto",
];

const CUSTO_LABEL: Record<Custo, { txt: string; emoji: string }> = {
  gratis: { txt: "Grátis", emoji: "🆓" },
  barato: { txt: "Barato", emoji: "💸" },
  medio: { txt: "Médio", emoji: "💰" },
  caro: { txt: "Caro", emoji: "💎" },
};

const LIKED_STORAGE_KEY = "sem-ideia:curtidas";
const MAX_TEXTO = 200;

type Screen = "home" | "loading" | "result" | "liked";

function loadLiked(): Idea[] {
  try {
    const raw = localStorage.getItem(LIKED_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Idea[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [input, setInput] = useState("");
  const [idea, setIdea] = useState<Idea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState<Idea[]>(loadLiked);
  const [copied, setCopied] = useState(false);
  const [shuffleEmoji, setShuffleEmoji] = useState("🎲");
  const historyRef = useRef<string[]>([]); // títulos já sorteados nesta sessão
  const lastQueryRef = useRef("");
  const shuffleTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // curtidas persistem entre visitas
  useEffect(() => {
    try {
      localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(liked));
    } catch {
      // armazenamento cheio/indisponível — segue sem persistir
    }
  }, [liked]);

  // animação de shuffle enquanto a IA pensa
  useEffect(() => {
    if (screen === "loading") {
      let i = 0;
      shuffleTimer.current = setInterval(() => {
        i = (i + 1) % SHUFFLE_EMOJIS.length;
        setShuffleEmoji(SHUFFLE_EMOJIS[i]);
      }, 110);
    }
    return () => clearInterval(shuffleTimer.current);
  }, [screen]);

  async function sortear(text: string) {
    const query = (text || "").trim().slice(0, MAX_TEXTO) || "me surpreenda com qualquer ideia";
    lastQueryRef.current = query;
    setError(null);
    setCopied(false);
    setScreen("loading");
    const minSpin = new Promise((r) => setTimeout(r, 1300)); // tempo mínimo de "roleta"
    try {
      const [result] = await Promise.all([fetchIdea(query, historyRef.current.slice(-8)), minSpin]);
      historyRef.current.push(result.titulo);
      setIdea(result);
      setScreen("result");
    } catch (e) {
      setError(e instanceof RateLimitError ? e.message : "Ops, a roleta travou. Tenta de novo!");
      setScreen("home");
    }
  }

  function toggleLike() {
    if (!idea) return;
    const exists = liked.some((l) => l.titulo === idea.titulo);
    setLiked(exists ? liked.filter((l) => l.titulo !== idea.titulo) : [...liked, idea]);
  }

  function copyIdea() {
    if (!idea) return;
    const txt = `${idea.emoji} ${idea.titulo}\n${idea.descricao}${idea.dica ? `\n💡 ${idea.dica}` : ""}`;
    navigator.clipboard
      .writeText(txt)
      .catch(() => {
        const ta = document.createElement("textarea");
        ta.value = txt;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      })
      .finally(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      });
  }

  const isLiked = idea !== null && liked.some((l) => l.titulo === idea.titulo);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 app-bg">
      {/* ---------------- HOME ---------------- */}
      {screen === "home" && (
        <div className="w-full max-w-md text-center float-up">
          <div className="text-7xl mb-3">🎲</div>
          <h1 className="display text-white text-5xl sm:text-6xl font-bold mb-2">Sem Ideia?</h1>
          <p className="text-white text-lg mb-6" style={{ opacity: 0.85 }}>
            Me fala do que você tá sem ideia.
          </p>

          <input
            className="input-box w-full px-5 py-4 text-lg mb-4"
            placeholder="ex: quero fazer algo com meus amigos…"
            maxLength={MAX_TEXTO}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sortear(input)}
          />

          <button className="btn-main w-full py-4 text-xl font-semibold mb-3" onClick={() => sortear(input)}>
            Me dá uma ideia
          </button>
          <button
            className="btn-ghost w-full py-3 text-lg mb-5"
            style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}
            onClick={() => sortear("")}
          >
            Surpreenda-me 🎲
          </button>

          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {QUICK_CHIPS.map((c) => (
              <button key={c} className="chip px-3 py-1 text-sm" onClick={() => sortear(c)}>
                {c}
              </button>
            ))}
          </div>

          {liked.length > 0 && (
            <button className="text-white text-sm underline" style={{ opacity: 0.8 }} onClick={() => setScreen("liked")}>
              ❤️ Minhas ideias ({liked.length})
            </button>
          )}

          {error && (
            <div className="mt-4 text-white font-semibold bg-black/20 rounded-xl py-2 px-4">{error}</div>
          )}
        </div>
      )}

      {/* ---------------- LOADING ---------------- */}
      {screen === "loading" && (
        <div className="text-center">
          <div className="dice text-8xl mb-6">{shuffleEmoji}</div>
          <p className="display text-white text-2xl">Sorteando uma ideia…</p>
        </div>
      )}

      {/* ---------------- RESULT ---------------- */}
      {screen === "result" && idea && (
        <div className="w-full max-w-md">
          <div className="card p-8 text-center pop">
            <div className="text-8xl mb-4">{idea.emoji}</div>
            <h2 className="display text-3xl font-bold mb-2" style={{ color: "var(--ink)" }}>
              {idea.titulo}
            </h2>
            <p className="text-lg mb-4" style={{ color: "var(--ink)", opacity: 0.8 }}>
              {idea.descricao}
            </p>

            <div className="flex flex-wrap gap-2 justify-center mb-4">
              <span className="badge px-3 py-1 text-sm">{idea.categoria}</span>
              <span className="badge px-3 py-1 text-sm">
                {(CUSTO_LABEL[idea.custo] ?? CUSTO_LABEL.gratis).emoji} {(CUSTO_LABEL[idea.custo] ?? CUSTO_LABEL.gratis).txt}
              </span>
              {(idea.companhia ?? []).map((c) => (
                <span key={c} className="badge px-3 py-1 text-sm">👥 {c}</span>
              ))}
            </div>

            {idea.dica && (
              <p
                className="text-sm mb-5 rounded-xl py-2 px-3"
                style={{ color: "var(--violet-deep)", background: "rgba(199,244,100,.35)" }}
              >
                💡 {idea.dica}
              </p>
            )}

            <button className="btn-main w-full py-4 text-lg font-semibold mb-3" onClick={() => sortear(lastQueryRef.current)}>
              Outra ideia 🎲
            </button>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 py-3" onClick={toggleLike}>
                {isLiked ? "❤️ Curtida!" : "🤍 Gostei"}
              </button>
              <button className="btn-ghost flex-1 py-3" onClick={copyIdea}>
                {copied ? "✅ Copiado" : "📋 Copiar"}
              </button>
              <button className="btn-ghost flex-1 py-3" onClick={() => setScreen("home")}>
                ↩ Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- LIKED ---------------- */}
      {screen === "liked" && (
        <div className="w-full max-w-md">
          <div className="card p-6 pop">
            <h2 className="display text-2xl font-bold mb-4 text-center" style={{ color: "var(--ink)" }}>
              ❤️ Minhas ideias
            </h2>
            {liked.length === 0 && (
              <p className="text-center mb-4" style={{ color: "var(--ink)", opacity: 0.7 }}>
                Nenhuma ideia curtida ainda. Bora sortear!
              </p>
            )}
            <div className="flex flex-col gap-3 mb-4">
              {liked.map((l) => (
                <div key={l.titulo} className="flex items-start gap-3 rounded-2xl p-3" style={{ background: "rgba(91,61,245,.07)" }}>
                  <span className="text-3xl">{l.emoji}</span>
                  <div className="flex-1 text-left">
                    <div className="display font-semibold" style={{ color: "var(--ink)" }}>{l.titulo}</div>
                    <div className="text-sm" style={{ color: "var(--ink)", opacity: 0.7 }}>{l.descricao}</div>
                  </div>
                  <button
                    className="text-sm"
                    style={{ color: "var(--pink)" }}
                    onClick={() => setLiked(liked.filter((x) => x.titulo !== l.titulo))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button className="btn-main w-full py-3 font-semibold" onClick={() => setScreen("home")}>
              ↩ Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
