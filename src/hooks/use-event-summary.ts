import { useMemo } from "react"
import type { AppEvent } from "@/lib/types"
import {
  computeBalances,
  computeNetBalances,
  computeSettlements,
  roundMoney,
  settlementPairId,
} from "@/lib/settlement"

export function useEventSummary(event: AppEvent | undefined) {
  return useMemo(() => {
    if (!event) return null
    const participants = event.participants
    const expenses = event.expenses

    const totalSpent = roundMoney(expenses.reduce((sum, e) => sum + e.amount, 0))
    const settlements = computeSettlements(participants, expenses).map((t) => {
      const id = settlementPairId(t.from, t.to)
      return { id, ...t, paid: event.settledPairs.includes(id) }
    })
    const net = computeNetBalances(participants, expenses)
    const balances = computeBalances(participants, expenses)

    const paidCount = settlements.filter((s) => s.paid).length
    const pendingSettlements = settlements.filter((s) => !s.paid)
    const settledPct = settlements.length === 0 ? 100 : Math.round((paidCount / settlements.length) * 100)
    const pendingTotal = roundMoney(pendingSettlements.reduce((sum, s) => sum + s.amount, 0))

    const nameOf = (id: string) => participants.find((p) => p.id === id)?.name ?? "?"

    return {
      participants,
      expenses,
      totalSpent,
      settlements,
      pendingSettlements,
      net,
      balances,
      paidCount,
      settledPct,
      pendingTotal,
      nameOf,
      isFullySettled: settlements.length > 0 && paidCount === settlements.length,
    }
  }, [event])
}

export type EventSummary = NonNullable<ReturnType<typeof useEventSummary>>
