import type { Idea, IdeaRequest } from "../shared/types";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 700;

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestIdea(body: IdeaRequest): Promise<Idea> {
  const response = await fetch("/api/idea", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 429) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new RateLimitError(data?.error ?? "Muitas ideias de uma vez! Espera um pouquinho.");
  }
  if (!response.ok) {
    const retryable = response.status >= 500;
    const err = new Error(`HTTP ${response.status}`);
    (err as Error & { retryable?: boolean }).retryable = retryable;
    throw err;
  }
  return (await response.json()) as Idea;
}

// Busca uma ideia no backend, tentando de novo em erros transitórios (rede / 5xx).
export async function fetchIdea(texto: string, historico: string[]): Promise<Idea> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await requestIdea({ texto, historico });
    } catch (err) {
      lastError = err;
      if (err instanceof RateLimitError) throw err; // não adianta insistir no rate limit
      const retryable =
        err instanceof TypeError || // falha de rede do fetch
        (err instanceof Error && (err as Error & { retryable?: boolean }).retryable === true);
      if (!retryable || attempt === MAX_RETRIES) break;
      await delay(RETRY_DELAY_MS * attempt);
    }
  }
  throw lastError;
}
