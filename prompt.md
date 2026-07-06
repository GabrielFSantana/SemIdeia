# Projeto: "Sem Ideia?" — versão produção

Crie o projeto completo nesta pasta.

## Referência visual e de UX
O arquivo `referencia.jsx` é um protótipo funcional. Replique fielmente
o visual, animações, textos e fluxo de telas dele.

## Stack
- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Node.js + Express (proxy para a API da Anthropic)
- A API key NUNCA vai no frontend. Fica em `.env` no backend.

## Backend (obrigatório)
- Endpoint POST /api/idea que recebe { texto, historico[] }
- Chama a API da Anthropic (model: claude-haiku-4-5-20251001 para custo baixo)
- Usa o mesmo prompt do referencia.jsx (função buildPrompt)
- Retorna o JSON da ideia já parseado
- Rate limiting: máx 10 requisições/minuto por IP
- Valida input (máx 200 caracteres)

## Mudanças vs referência
- Curtidas em localStorage (na versão produção funciona)
- fetch aponta para /api/idea em vez da API direta
- Tratamento de erro com retry

## Critérios de aceite
- [ ] npm install && npm run dev roda front e back
- [ ] .env.example incluído, .env no .gitignore
- [ ] TypeScript sem erros
- [ ] Funciona em 375px de largura