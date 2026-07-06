// Mesmo prompt do protótipo (referencia.jsx, função buildPrompt).
export function buildPrompt(userText: string, previousTitles: string[]): string {
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
