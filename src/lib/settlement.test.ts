import { describe, expect, it } from "vitest"
import {
  aggregateSameOriginAndDestinationTransactions,
  buildTransactionsFromParticipantsAndExpenses,
  computeBalances,
  computeNetBalances,
  computeSettlements,
  roundMoney,
  settlementPairId,
  simplifyAggregatedTransactions,
  simplifyTransactionsWithDebtPurchase,
} from "./settlement"
import type { Expense, Participant } from "./types"

// Dados originais do rateio.ts (viagem Yuri/Rodrigo/Geovane).
const participants: Participant[] = [
  { id: "1", name: "Yuri" },
  { id: "2", name: "Rodrigo" },
  { id: "3", name: "Geovane" },
]

const expenses: Expense[] = [
  { id: "1", description: "Combustível", amount: 93.81, paidBy: "1", splitBetween: ["1", "2", "3"], category: "transport", date: "2023-10-24" },
  { id: "2", description: "Pedágios", amount: 36.95, paidBy: "1", splitBetween: ["1", "2", "3"], category: "transport", date: "2023-10-24" },
  { id: "3", description: "Estacionamento", amount: 17, paidBy: "3", splitBetween: ["1", "2", "3"], category: "transport", date: "2023-10-23" },
  { id: "4", description: "Lanche", amount: 66, paidBy: "2", splitBetween: ["1", "2"], category: "food", date: "2023-10-22" },
]

describe("roundMoney", () => {
  it("arredonda para 2 casas decimais", () => {
    expect(roundMoney(36.95 / 3)).toBe(12.32)
    expect(roundMoney(17 / 3)).toBe(5.67)
    expect(roundMoney(93.81 / 3)).toBe(31.27)
  })
})

describe("pipeline de rateio (dados da viagem original)", () => {
  it("constrói uma transação por devedor de cada despesa", () => {
    const txs = buildTransactionsFromParticipantsAndExpenses(participants, expenses)
    // exp1: 2, exp2: 2, exp3: 2, exp4: 1 = 7 transações
    expect(txs).toHaveLength(7)
  })

  it("agrega transações de mesma origem/destino", () => {
    const txs = buildTransactionsFromParticipantsAndExpenses(participants, expenses)
    const agg = aggregateSameOriginAndDestinationTransactions(txs)
    expect(agg).toContainEqual({ from: "2", to: "1", amount: 43.59 })
    expect(agg).toContainEqual({ from: "3", to: "1", amount: 43.59 })
    expect(agg).toContainEqual({ from: "1", to: "3", amount: 5.67 })
    expect(agg).toContainEqual({ from: "2", to: "3", amount: 5.67 })
    expect(agg).toContainEqual({ from: "1", to: "2", amount: 33 })
  })

  it("abate crédito e dívida entre pares opostos", () => {
    const agg = aggregateSameOriginAndDestinationTransactions(
      buildTransactionsFromParticipantsAndExpenses(participants, expenses),
    )
    const simplified = simplifyAggregatedTransactions(agg)
    expect(simplified).toContainEqual({ from: "2", to: "1", amount: 10.59 })
    expect(simplified).toContainEqual({ from: "3", to: "1", amount: 37.92 })
    expect(simplified).toContainEqual({ from: "2", to: "3", amount: 5.67 })
    expect(simplified).toHaveLength(3)
  })

  it("repassa dívidas e produz as transferências finais mínimas", () => {
    const simplified = simplifyAggregatedTransactions(
      aggregateSameOriginAndDestinationTransactions(
        buildTransactionsFromParticipantsAndExpenses(participants, expenses),
      ),
    )
    const direct = simplifyTransactionsWithDebtPurchase(participants, simplified)
    // Bate exatamente com a tela do dashboard "Quem paga quem".
    expect(direct).toEqual([
      { from: "2", to: "1", amount: 16.26 }, // Rodrigo -> Yuri
      { from: "3", to: "1", amount: 32.25 }, // Geovane -> Yuri
    ])
  })

  it("computeSettlements roda o pipeline completo", () => {
    expect(computeSettlements(participants, expenses)).toEqual([
      { from: "2", to: "1", amount: 16.26 },
      { from: "3", to: "1", amount: 32.25 },
    ])
  })
})

describe("saldos", () => {
  it("computeNetBalances bate com o dashboard (soma zero)", () => {
    const net = computeNetBalances(participants, expenses)
    expect(net.get("1")).toBe(48.51) // Yuri credor
    expect(net.get("2")).toBe(-16.26) // Rodrigo devedor
    expect(net.get("3")).toBe(-32.25) // Geovane devedor
    const total = [...net.values()].reduce((a, b) => a + b, 0)
    expect(roundMoney(total)).toBe(0)
  })

  it("computeBalances retorna pago/consumido por participante", () => {
    const balances = computeBalances(participants, expenses)
    const yuri = balances.find((b) => b.participantId === "1")!
    expect(yuri.paid).toBe(130.76) // 93.81 + 36.95
    const rodrigo = balances.find((b) => b.participantId === "2")!
    expect(rodrigo.paid).toBe(66)
    const geovane = balances.find((b) => b.participantId === "3")!
    expect(geovane.paid).toBe(17)
  })
})

describe("casos de borda", () => {
  it("despesa sem participantes não gera transação", () => {
    const e: Expense[] = [
      { id: "x", description: "vazio", amount: 50, paidBy: "1", splitBetween: [], category: "other", date: "2023-01-01" },
    ]
    expect(computeSettlements(participants, e)).toEqual([])
  })

  it("quem pagou e é o único do rateio não deve nada", () => {
    const e: Expense[] = [
      { id: "x", description: "só ele", amount: 50, paidBy: "1", splitBetween: ["1"], category: "other", date: "2023-01-01" },
    ]
    expect(computeSettlements(participants, e)).toEqual([])
  })
})

describe("settlementPairId", () => {
  it("gera o identificador canônico from->to", () => {
    expect(settlementPairId("2", "1")).toBe("2->1")
    expect(settlementPairId("A", "B")).toBe("A->B")
    expect(settlementPairId("alice", "bob")).toBe("alice->bob")
  })
})

describe("computeBalances — casos adicionais", () => {
  it("participante que não pagou nem consumiu tem todos os campos zerados", () => {
    const partes = [{ id: "1", name: "Alice" }, { id: "2", name: "Bob" }]
    const e: Expense[] = [
      { id: "x", description: "test", amount: 100, paidBy: "1", splitBetween: ["1"], category: "other", date: "2023-01-01" },
    ]
    const balances = computeBalances(partes, e)
    const bob = balances.find((b) => b.participantId === "2")!
    expect(bob.paid).toBe(0)
    expect(bob.consumed).toBe(0)
    expect(bob.balance).toBe(0)
  })

  it("pagador fora do splitBetween não consome nada do gasto", () => {
    const partes = [{ id: "1", name: "Alice" }, { id: "2", name: "Bob" }]
    const e: Expense[] = [
      { id: "x", description: "test", amount: 100, paidBy: "1", splitBetween: ["2"], category: "other", date: "2023-01-01" },
    ]
    const balances = computeBalances(partes, e)
    const alice = balances.find((b) => b.participantId === "1")!
    expect(alice.paid).toBe(100)
    expect(alice.consumed).toBe(0)
    expect(alice.balance).toBe(100)
  })
})

describe("computeSettlements — 4 participantes", () => {
  const partes = [
    { id: "A", name: "A" }, { id: "B", name: "B" },
    { id: "C", name: "C" }, { id: "D", name: "D" },
  ]

  it("com 1 pagador gera exatamente 3 transferências", () => {
    const e: Expense[] = [
      { id: "e1", description: "Jantar", amount: 200, paidBy: "A", splitBetween: ["A", "B", "C", "D"], category: "food", date: "2023-01-01" },
    ]
    const s = computeSettlements(partes, e)
    expect(s).toHaveLength(3)
    expect(s.every((t) => t.to === "A")).toBe(true)
    expect(roundMoney(s.reduce((acc, t) => acc + t.amount, 0))).toBe(150)
  })

  it("saldo líquido final sempre soma zero independente do número de pagadores", () => {
    const e: Expense[] = [
      { id: "e1", description: "Almoço", amount: 200, paidBy: "A", splitBetween: ["A", "B", "C", "D"], category: "food", date: "2023-01-01" },
      { id: "e2", description: "Café",   amount: 100, paidBy: "B", splitBetween: ["A", "B", "C", "D"], category: "food", date: "2023-01-01" },
    ]
    const net = computeNetBalances(partes, e)
    expect(roundMoney([...net.values()].reduce((a, b) => a + b, 0))).toBe(0)
  })
})
