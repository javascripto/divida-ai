# Divida aí

Webapp para dividir despesas em grupo, como viagens, jantares e repúblicas. O app é **100% client-side**, não exige cadastro nem backend e mantém os dados no próprio navegador.

## Funcionalidades

- **Eventos**: criação, edição, duplicação e exclusão, com os estados Aberto, Fechado e Quitado
- **Despesas**: cadastro por categoria, pagador, data, observações e participantes do rateio
- **Recibos**: anexos de imagens e PDFs vinculados às despesas
- **Participantes**: acompanhamento do total pago, consumido e do saldo individual
- **Acertos**: cálculo de quem paga quem, com simplificação das transferências e marcação de pagamentos realizados
- **Dashboard**: resumo do total gasto, saldos e pagamentos pendentes
- **Configurações**: moeda padrão e temas claro, escuro ou conforme o sistema
- **Backup**: exportação e importação em JSON ou ZIP, com opção de incluir os recibos
- **PWA**: pode ser instalado em dispositivos e usado como um aplicativo independente

## Armazenamento

Os dados permanecem somente no dispositivo do usuário:

- eventos, despesas, participantes, acertos e configurações ficam no `localStorage`;
- arquivos de recibos ficam no IndexedDB.

Limpar os dados do site no navegador também remove as informações do app. Para transferir ou preservar os dados, use as opções de backup em **Configurações**.

## Stack

- **React 19**, **Vite 6** e **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** com primitives do Radix UI
- **React Router** para navegação
- **Vitest** e Testing Library para testes unitários e de componentes
- **Playwright** para testes de ponta a ponta
- **Sonner** para notificações e **Lucide React** para ícones
- **idb** para acesso ao IndexedDB e **JSZip** para backups com anexos

## Algoritmo de rateio

A lógica de [`rateio.ts`](rateio.ts) é implementada em [`src/lib/settlement.ts`](src/lib/settlement.ts) em quatro etapas:

1. Construir as transações de cada despesa a partir do pagador e dos participantes do rateio
2. Agregar transações com a mesma origem e o mesmo destino
3. Abater créditos e dívidas entre pares opostos
4. Repassar dívidas para reduzir o número de transferências necessárias

O comportamento é coberto pelos testes de [`src/lib/settlement.test.ts`](src/lib/settlement.test.ts).

## Como executar

### Pré-requisitos

- Node.js 20 ou mais recente
- npm

### Desenvolvimento

```bash
npm install
npm run dev
```

O app estará disponível em [http://localhost:5173](http://localhost:5173).

## Comandos

```bash
npm run dev             # inicia o servidor de desenvolvimento
npm run build           # gera o build de produção
npm run preview         # serve localmente o build de produção
npm test                # executa os testes com Vitest
npm run test:watch      # executa o Vitest em modo interativo
npm run test:e2e        # executa os testes E2E com Playwright
npm run test:e2e:headed # executa os testes E2E com o navegador visível
npm run test:e2e:ui     # abre a interface do Playwright
```

Os testes E2E iniciam ou reutilizam automaticamente o servidor na porta `5173`.

## Build e deploy

```bash
npm run build
```

Os arquivos de produção são gerados em `dist/`. O projeto também inclui configuração de deploy para a Vercel em [`vercel.json`](vercel.json).
