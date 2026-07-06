# 🎲 Sem Ideia?

Gerador de ideias com IA: você fala do que está sem ideia e o app sorteia uma sugestão divertida e realizável, gerada pelo Claude.

Desenvolvido por **Gabriel Santana (Biu)** — [LinkedIn](https://www.linkedin.com/in/gabrielsbelarmino/) · [GitHub](https://github.com/GabrielFSantana)

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express (proxy para a API da Anthropic, modelo `claude-haiku-4-5-20251001`)
- A API key fica **somente** no backend, em `.env` (nunca vai para o frontend nem para o git).

## Como rodar

```bash
# 1. Instale as dependências
npm install

# 2. Configure a chave da Anthropic
cp .env.example .env
# edite .env e coloque sua ANTHROPIC_API_KEY

# 3. Suba front e back juntos
npm run dev
```

- Frontend: http://localhost:5173 (o Vite faz proxy de `/api` para o backend)
- Backend: http://localhost:3001

## Scripts

| Script              | O que faz                                          |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Sobe backend (tsx watch) e frontend (Vite) juntos  |
| `npm run typecheck` | Checa os tipos do frontend e do backend            |
| `npm run build`     | Typecheck + build de produção do frontend          |
| `npm start`         | Sobe apenas o backend                              |

## API

### `POST /api/idea`

```json
{ "texto": "quero sair com meus amigos", "historico": ["Título já sorteado"] }
```

- `texto`: obrigatório, máx. **200 caracteres**
- `historico`: opcional, últimos títulos sorteados (evita repetição; o servidor usa no máx. os 8 últimos)

Resposta (JSON já parseado):

```json
{
  "emoji": "🍢",
  "titulo": "Rolê de espetinho na praça",
  "descricao": "Chama a galera pra caçar a melhor barraquinha de espetinho da cidade.",
  "categoria": "Rolê",
  "custo": "barato",
  "companhia": ["amigos"],
  "dica": "Termina com açaí pra fechar com chave de ouro."
}
```

- **Rate limit:** máx. 10 requisições/minuto por IP (responde `429`).
- Erros transitórios (rede/5xx) são retentados automaticamente pelo frontend.

## Funcionalidades

- 🎲 Sorteio de ideia a partir de qualquer texto (ou "Surpreenda-me")
- 🔁 "Outra ideia" evita repetir os títulos já sorteados na sessão
- ❤️ Curtidas persistidas em `localStorage`
- 📋 Copiar ideia para a área de transferência
- 📱 Layout responsivo (funciona em 375px de largura)
