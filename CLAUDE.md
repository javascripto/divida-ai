# Conta Certa

App client-side de divisão de despesas. Stack: React + Vite + TypeScript + shadcn/ui + Tailwind CSS v4.

## Rodar e visualizar

Para ver o app no browser do Claude:

1. Verificar se o servidor já está rodando: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173`
   - Se retornar `200`, pular para o passo 3.
2. Subir o servidor: `npm run dev -- --port 5173` (em background)
3. Abrir no browser integrado via `mcp__chrome-devtools__new_page` com `url=http://localhost:5173`
4. Para simular mobile (390×844 px): `mcp__chrome-devtools__resize_page` com `width=390, height=844`

Porta fixa: **5173**. Sem backend, sem variáveis de ambiente necessárias.
