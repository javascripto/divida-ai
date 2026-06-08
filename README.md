# Conta Certa

Webapp para dividir despesas em grupo (viagens, jantares, repúblicas) — **100% client-side, sem backend**. Todos os dados ficam no `localStorage` do navegador.

Construído a partir do algoritmo de rateio em `rateio.ts` e das telas geradas no Google Stitch.

## Stack

- **React 19** + **Vite 6** + **TypeScript**
- **Tailwind CSS v4** com os tokens do design system (`DESIGN.md`)
- Componentes no estilo **shadcn/ui** (Radix primitives) estilizados com a paleta "Digital Indigo"
- **React Router** para navegação
- **Vitest** + Testing Library para os testes
- **sonner** para toasts, **lucide-react** para ícones

## Funcionalidades

- **Eventos**: criar, editar, duplicar, excluir; status Aberto/Fechado/Quitado
- **Despesas**: adicionar/editar com categoria, pagador, data, notas e divisão entre participantes
- **Participantes**: gestão com total pago, total consumido e saldo final
- **Acertos** ("Quem paga quem"): transferências mínimas calculadas pelo algoritmo de rateio, com marcação de pago
- **Dashboard**: total gasto, saldos (credor/devedor) e pagamentos pendentes
- **Configurações**: moeda padrão, modo claro/escuro/sistema, exportar/importar/limpar dados (backup JSON)

## O algoritmo de rateio

A lógica original (`rateio.ts`) foi portada para [`src/lib/settlement.ts`](src/lib/settlement.ts) em 4 etapas:

1. Construir transações por despesa (divisão igual entre participantes)
2. Agregar transações de mesma origem/destino
3. Abater crédito e dívida entre pares opostos
4. Repassar dívidas para minimizar o número de transferências

Verificado por testes contra a saída original (ver `src/lib/settlement.test.ts`).

## Comandos

```bash
npm install      # instala dependências
npm run dev      # servidor de desenvolvimento (http://localhost:5173)
npm run build    # build de produção (tsc + vite)
npm run preview  # pré-visualiza o build
npm test         # roda os testes (vitest)
```

## Notas

- `rateio.ts` (referência original) e a pasta `stitch_conta_certa_expense_splitter/` (telas do Stitch) estão no `.gitignore` por não fazerem parte do código-fonte da aplicação.
