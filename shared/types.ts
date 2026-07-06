export const CUSTOS = ["gratis", "barato", "medio", "caro"] as const;

export type Custo = (typeof CUSTOS)[number];

export interface Idea {
  emoji: string;
  titulo: string;
  descricao: string;
  categoria: string;
  custo: Custo;
  companhia: string[];
  dica?: string;
}

export interface IdeaRequest {
  texto: string;
  historico: string[];
}
