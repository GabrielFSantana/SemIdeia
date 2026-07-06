import { useState, useRef, useEffect } from "react";

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

const CUSTO_LABEL = {
  gratis: { txt: "Grátis", emoji: "🆓" },
  barato: { txt: "Barato", emoji: "💸" },
  medio: { txt: "Médio", emoji: "💰" },
  caro: { txt: "Caro", emoji: "💎" },
};

function buildPrompt(userText, previousTitles) {
  const avoid = previousTitles.length
    ? `\nNÃO repita nem varie estas ideias já sugeridas: ${previousTitles.join("; ")}.`
    : "";
  return `Você é o motor do app "Sem Ideia?", que sugere UMA ideia divertida do que fazer.

O usuário escreveu: "${userText}"

Interprete o que ele quer (sozinho/amigos/casal/família, comida, viagem, jogo, filme, projeto, tédio, etc). Se o texto for vago, escolha algo aleatório e surpreendente. Contexto brasileiro (pode citar churrasco, pastel, rolê, etc). Tom leve e bem-humorado, mas a ideia deve ser REALIZÁVEL de verdade — nada genérico tipo "assista um filme"; seja específico e criativo.${avoid}

Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois, neste formato exato:
{
  "emoji": "um único emoji",
  "titulo": "título curto, máx 6 palavras",
  "descricao": "1 a 2 frases explicando a ideia, tom divertido",
  "categoria": "ex: Comida, Viagem, Jogos, Rolê, Projeto, Filmes, Casa...",
  "custo": "gratis | barato | medio | caro",
  "companhia": ["sozinho e/ou amigos e/ou casal e/ou família"],
  "dica": "uma dica extra curta e opcional para turbinar a ideia"
}`;
}

async function fetchIdea(userText, previousTitles) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: buildPrompt(userText, previousTitles) }],
    }),
  });
  const data = await response.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  return JSON.parse(clean.slice(start, end + 1));
}

export default function App() {
  const [screen, setScreen] = useState("home"); // home | loading | result | liked
  const [input, setInput] = useState("");
  const [idea, setIdea] = useState(null);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState([]);
  const [copied, setCopied] = useState(false);
  const [shuffleEmoji, setShuffleEmoji] = useState("🎲");
  const historyRef = useRef([]); // títulos já sorteados nesta sessão
  const lastQueryRef = useRef("");
  const shuffleTimer = useRef(null);

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

  async function sortear(text) {
    const query = (text || "").trim() || "me surpreenda com qualquer ideia";
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
      setError("Ops, a roleta travou. Tenta de novo!");
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
    const ta = document.createElement("textarea");
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const isLiked = idea && liked.some((l) => l.titulo === idea.titulo);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 app-bg">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito+Sans:wght@400;600;700&display=swap');
        :root {
          --violet: #5B3DF5;
          --violet-deep: #3A22B8;
          --cream: #FFF7EC;
          --pink: #FF5CA8;
          --lime: #C7F464;
          --ink: #241B4D;
        }
        .app-bg {
          background: radial-gradient(1200px 800px at 20% -10%, #7B5CFF 0%, var(--violet) 45%, var(--violet-deep) 100%);
          font-family: 'Nunito Sans', system-ui, sans-serif;
        }
        .display { font-family: 'Fredoka', sans-serif; }
        .card {
          background: var(--cream);
          border-radius: 28px;
          box-shadow: 0 24px 60px rgba(20, 10, 70, .45), 0 2px 0 rgba(255,255,255,.25) inset;
        }
        .btn-main {
          background: var(--pink);
          color: #fff;
          border-radius: 999px;
          font-family: 'Fredoka', sans-serif;
          transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
          box-shadow: 0 6px 0 #C22E7B;
        }
        .btn-main:hover { transform: translateY(-2px); filter: brightness(1.05); }
        .btn-main:active { transform: translateY(2px); box-shadow: 0 2px 0 #C22E7B; }
        .btn-ghost {
          background: transparent;
          color: var(--ink);
          border: 2px solid rgba(36,27,77,.25);
          border-radius: 999px;
          font-family: 'Fredoka', sans-serif;
          transition: all .12s ease;
        }
        .btn-ghost:hover { border-color: var(--ink); background: rgba(36,27,77,.05); }
        .chip {
          background: rgba(255,255,255,.14);
          color: #fff;
          border: 1px solid rgba(255,255,255,.28);
          border-radius: 999px;
          transition: all .12s ease;
          cursor: pointer;
        }
        .chip:hover { background: rgba(255,255,255,.26); transform: translateY(-1px); }
        .badge {
          background: rgba(91,61,245,.1);
          color: var(--violet-deep);
          border-radius: 999px;
          font-weight: 700;
        }
        .input-box {
          background: #fff;
          border: 3px solid transparent;
          border-radius: 18px;
          color: var(--ink);
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .input-box:focus {
          outline: none;
          border-color: var(--lime);
          box-shadow: 0 0 0 4px rgba(199,244,100,.35);
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(.85) translateY(16px); }
          60% { transform: scale(1.04) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .pop { animation: popIn .45s cubic-bezier(.2,.9,.3,1.2) both; }
        @keyframes spinDice {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.25); }
          100% { transform: rotate(360deg) scale(1); }
        }
        .dice { animation: spinDice .55s linear infinite; display: inline-block; }
        @keyframes floatUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .float-up { animation: floatUp .4s ease both; }
        @media (prefers-reduced-motion: reduce) {
          .dice, .pop, .float-up { animation: none; }
        }
      `}</style>

      {/* ---------------- HOME ---------------- */}
      {screen === "home" && (
        <div className="w-full max-w-md text-center float-up">
          <div className="text-7xl mb-3">🎲</div>
          <h1 className="display text-white text-6xl font-bold mb-2">Sem Ideia?</h1>
          <p className="text-white text-lg mb-6" style={{ opacity: 0.85 }}>
            Me fala do que você tá sem ideia.
          </p>

          <input
            className="input-box w-full px-5 py-4 text-lg mb-4"
            placeholder="ex: quero fazer algo com meus amigos…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sortear(input)}
          />

          <button className="btn-main w-full py-4 text-xl font-semibold mb-3" onClick={() => sortear(input)}>
            Me dá uma ideia
          </button>
          <button className="btn-ghost w-full py-3 text-lg mb-5" style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }} onClick={() => sortear("")}>
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
            <div className="mt-4 text-white font-semibold bg-black bg-opacity-20 rounded-xl py-2 px-4">{error}</div>
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
                {(CUSTO_LABEL[idea.custo] || CUSTO_LABEL.gratis).emoji} {(CUSTO_LABEL[idea.custo] || CUSTO_LABEL.gratis).txt}
              </span>
              {(idea.companhia || []).map((c) => (
                <span key={c} className="badge px-3 py-1 text-sm">👥 {c}</span>
              ))}
            </div>

            {idea.dica && (
              <p className="text-sm mb-5 rounded-xl py-2 px-3" style={{ color: "var(--violet-deep)", background: "rgba(199,244,100,.35)" }}>
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