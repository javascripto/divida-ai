import type { Expense, Participant, Transaction } from "./types"

// ---------------------------------------------------------------------------
// Algoritmo de rateio portado de rateio.ts (lógica original do usuário).
// As 4 etapas: construir transações -> agregar -> abater crédito/dívida ->
// repassar dívidas para minimizar o número de transferências.
// ---------------------------------------------------------------------------

export const roundMoney = (value: number) => Math.round(value * 100) / 100

// Baseado nas despesas, são criadas transações de quem deve pagar para quem,
// considerando o valor total da despesa dividido igualmente entre os participantes.
export function buildTransactionsFromParticipantsAndExpenses(
  _participants: Participant[],
  expenses: Expense[],
): Transaction[] {
  const transactions: Transaction[] = []
  for (const expense of expenses) {
    if (expense.splitBetween.length === 0) continue
    const participantsOwnedAmount = roundMoney(expense.amount / expense.splitBetween.length)
    for (const participantId of expense.splitBetween) {
      if (participantId === expense.paidBy) continue
      transactions.push({
        from: participantId,
        to: expense.paidBy,
        amount: participantsOwnedAmount,
      })
    }
  }
  return transactions
}

// Transações com mesma origem e destinatários são somadas para simplificar o
// processo de pagamento.
export function aggregateSameOriginAndDestinationTransactions(
  transactions: Transaction[],
): Transaction[] {
  return transactions.reduce((acc: Transaction[], transaction) => {
    const existing = acc.find((t) => t.from === transaction.from && t.to === transaction.to)
    if (existing) {
      existing.amount = roundMoney(existing.amount + transaction.amount)
    } else {
      acc.push({ ...transaction })
    }
    return acc
  }, [])
}

// Transações são simplificadas abatendo crédito e dívida para não precisar
// devolver dinheiro de quem envia e recebe.
export function simplifyAggregatedTransactions(transactions: Transaction[]): Transaction[] {
  const simplified: Transaction[] = []
  for (const transaction of transactions) {
    const opposite = transactions.find(
      (t) => t.from === transaction.to && t.to === transaction.from,
    )
    if (opposite) {
      const difference = roundMoney(transaction.amount - opposite.amount)
      if (difference > 0) {
        simplified.push({ ...transaction, amount: difference })
      }
    } else {
      simplified.push({ ...transaction })
    }
  }
  return simplified
}

// Transações são simplificadas novamente para transferir dívidas e reduzir o
// número de transferências entre participantes.
export function simplifyTransactionsWithDebtPurchase(
  participants: Participant[],
  simplifiedTransactions: Transaction[],
): Transaction[] {
  const balanceByParticipant = participants.reduce(
    (map, { id }) => map.set(id, 0),
    new Map<string, number>(),
  )

  for (const transaction of simplifiedTransactions) {
    const fromBalance = balanceByParticipant.get(transaction.from) ?? 0
    const toBalance = balanceByParticipant.get(transaction.to) ?? 0
    balanceByParticipant.set(transaction.from, roundMoney(fromBalance - transaction.amount))
    balanceByParticipant.set(transaction.to, roundMoney(toBalance + transaction.amount))
  }

  const debtors = Array.from(balanceByParticipant.entries())
    .filter(([, balance]) => balance < 0)
    .map(([participantId, balance]) => ({ participantId, amount: roundMoney(Math.abs(balance)) }))

  const creditors = Array.from(balanceByParticipant.entries())
    .filter(([, balance]) => balance > 0)
    .map(([participantId, balance]) => ({ participantId, amount: roundMoney(balance) }))

  const directTransactions: Transaction[] = []
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    const amount = roundMoney(Math.min(debtor.amount, creditor.amount))

    directTransactions.push({ from: debtor.participantId, to: creditor.participantId, amount })

    debtor.amount = roundMoney(debtor.amount - amount)
    creditor.amount = roundMoney(creditor.amount - amount)

    if (debtor.amount === 0) debtorIndex++
    if (creditor.amount === 0) creditorIndex++
  }
  return directTransactions
}

/**
 * Pipeline completo: das despesas até as transferências diretas mínimas.
 * É o que alimenta a tela "Quem paga quem" / Acertos.
 */
export function computeSettlements(
  participants: Participant[],
  expenses: Expense[],
): Transaction[] {
  const transactions = buildTransactionsFromParticipantsAndExpenses(participants, expenses)
  const aggregated = aggregateSameOriginAndDestinationTransactions(transactions)
  const simplified = simplifyAggregatedTransactions(aggregated)
  return simplifyTransactionsWithDebtPurchase(participants, simplified)
}

// ---------------------------------------------------------------------------
// Saldos por participante (Total pago, Total consumido, Saldo final).
// ---------------------------------------------------------------------------

export type ParticipantBalance = {
  participantId: string
  paid: number // total que a pessoa pagou
  consumed: number // total que a pessoa consumiu (sua parte das despesas)
  balance: number // paid - consumed (positivo = credor, negativo = devedor)
}

export function computeBalances(
  participants: Participant[],
  expenses: Expense[],
): ParticipantBalance[] {
  const paid = new Map<string, number>()
  const consumed = new Map<string, number>()
  for (const { id } of participants) {
    paid.set(id, 0)
    consumed.set(id, 0)
  }

  for (const expense of expenses) {
    paid.set(expense.paidBy, roundMoney((paid.get(expense.paidBy) ?? 0) + expense.amount))
    if (expense.splitBetween.length === 0) continue
    const share = roundMoney(expense.amount / expense.splitBetween.length)
    for (const participantId of expense.splitBetween) {
      consumed.set(participantId, roundMoney((consumed.get(participantId) ?? 0) + share))
    }
  }

  return participants.map(({ id }) => {
    const p = paid.get(id) ?? 0
    const c = consumed.get(id) ?? 0
    return { participantId: id, paid: p, consumed: c, balance: roundMoney(p - c) }
  })
}

/**
 * Saldo líquido por participante derivado das transferências finais (sempre
 * soma zero). É o que a tela Dashboard mostra em "Saldo dos participantes":
 * positivo = credor, negativo = devedor.
 */
export function computeNetBalances(
  participants: Participant[],
  expenses: Expense[],
): Map<string, number> {
  const net = new Map<string, number>()
  for (const { id } of participants) net.set(id, 0)
  for (const t of computeSettlements(participants, expenses)) {
    net.set(t.from, roundMoney((net.get(t.from) ?? 0) - t.amount))
    net.set(t.to, roundMoney((net.get(t.to) ?? 0) + t.amount))
  }
  return net
}

export const settlementPairId = (from: string, to: string) => `${from}->${to}`
