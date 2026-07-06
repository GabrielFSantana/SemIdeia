import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt } from "./prompt";
import { CUSTOS, type Custo, type Idea } from "../shared/types";

const PORT = Number(process.env.PORT ?? 3001);
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TEXTO = 200;
const MAX_HISTORICO = 8;
// Teto global de ideias por dia (proteção de custo) — ajustável via env
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT ?? 500);

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.warn(
    "⚠  ANTHROPIC_API_KEY não definida. Copie .env.example para .env e preencha a chave.",
  );
}
const anthropic = new Anthropic({ apiKey: apiKey ?? "nao-configurada" });

const app = express();
// Atrás do proxy da hospedagem (Render etc.), o IP real do visitante vem
// no X-Forwarded-For — sem isso o rate limit trataria todo mundo como um IP só.
app.set("trust proxy", 1);
app.use(express.json({ limit: "16kb" }));

// Máx 10 requisições/minuto por IP
const ideaLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Calma aí! Máximo de 10 ideias por minuto. Respira e tenta já já. 😅" },
});

// Teto global diário (todas as pessoas somadas) — evita surpresa na fatura
let dailyCount = 0;
let dailyDate = new Date().toDateString();

function checkDailyLimit(): boolean {
  const today = new Date().toDateString();
  if (today !== dailyDate) {
    dailyDate = today;
    dailyCount = 0;
  }
  if (dailyCount >= DAILY_LIMIT) return false;
  dailyCount++;
  return true;
}

interface ParsedInput {
  texto: string;
  historico: string[];
}

function validateInput(body: unknown): ParsedInput | { erro: string } {
  if (typeof body !== "object" || body === null) {
    return { erro: "Corpo da requisição inválido." };
  }
  const { texto, historico } = body as Record<string, unknown>;

  if (typeof texto !== "string" || texto.trim().length === 0) {
    return { erro: "Campo 'texto' é obrigatório." };
  }
  if (texto.length > MAX_TEXTO) {
    return { erro: `Campo 'texto' deve ter no máximo ${MAX_TEXTO} caracteres.` };
  }

  let titles: string[] = [];
  if (historico !== undefined) {
    if (!Array.isArray(historico) || historico.some((t) => typeof t !== "string")) {
      return { erro: "Campo 'historico' deve ser uma lista de strings." };
    }
    titles = (historico as string[]).slice(-MAX_HISTORICO).map((t) => t.slice(0, 120));
  }

  return { texto: texto.trim(), historico: titles };
}

function parseIdea(raw: string): Idea {
  const clean = raw.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Resposta do modelo sem JSON.");

  const data = JSON.parse(clean.slice(start, end + 1)) as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === "string" ? v : "");

  const custo: Custo = CUSTOS.includes(data.custo as Custo) ? (data.custo as Custo) : "gratis";
  const companhia = Array.isArray(data.companhia)
    ? data.companhia.filter((c): c is string => typeof c === "string")
    : [];

  const idea: Idea = {
    emoji: str(data.emoji) || "🎲",
    titulo: str(data.titulo),
    descricao: str(data.descricao),
    categoria: str(data.categoria) || "Surpresa",
    custo,
    companhia,
    dica: str(data.dica) || undefined,
  };

  if (!idea.titulo || !idea.descricao) throw new Error("Ideia incompleta na resposta do modelo.");
  return idea;
}

app.post("/api/idea", ideaLimiter, async (req, res) => {
  const input = validateInput(req.body);
  if ("erro" in input) {
    res.status(400).json({ error: input.erro });
    return;
  }
  if (!apiKey) {
    res.status(500).json({ error: "Servidor sem ANTHROPIC_API_KEY configurada." });
    return;
  }
  if (!checkDailyLimit()) {
    res.status(429).json({ error: "O dado cansou por hoje! 😴 Volta amanhã que tem mais ideia." });
    return;
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: buildPrompt(input.texto, input.historico) }],
      // Structured outputs: a API garante JSON válido neste schema,
      // eliminando a fragilidade de extrair JSON de texto livre.
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              emoji: { type: "string", description: "um único emoji" },
              titulo: { type: "string", description: "título curto, máx 6 palavras" },
              descricao: { type: "string", description: "1 a 2 frases, tom divertido" },
              categoria: { type: "string" },
              custo: { type: "string", enum: [...CUSTOS] },
              companhia: { type: "array", items: { type: "string" } },
              dica: { type: "string", description: "dica extra curta e opcional" },
            },
            required: ["emoji", "titulo", "descricao", "categoria", "custo", "companhia"],
            additionalProperties: false,
          },
        },
      },
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    res.json(parseIdea(text));
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`Erro da API Anthropic (${err.status}):`, err.message);
      // 429/529 da Anthropic são transitórios — o frontend pode tentar de novo
      const status = err.status === 429 || (err.status ?? 0) >= 500 ? 503 : 502;
      res.status(status).json({ error: "A roleta travou do nosso lado. Tenta de novo!" });
      return;
    }
    console.error("Erro ao gerar ideia:", err);
    res.status(502).json({ error: "Não consegui montar uma ideia agora. Tenta de novo!" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Em produção não existe o dev server do Vite: o Express serve o frontend
// buildado (dist/). Em dev a pasta não existe e este bloco é ignorado.
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ error: "Rota não encontrada." });
      return;
    }
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`🎲 API "Sem Ideia?" rodando em http://localhost:${PORT}`);
});
