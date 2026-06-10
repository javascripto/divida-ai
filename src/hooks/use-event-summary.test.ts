import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useEventSummary } from "./use-event-summary"
import type { AppEvent } from "@/lib/types"

function makeEvent(overrides: Partial<AppEvent> = {}): AppEvent {
  return {
    id: "ev1",
    name: "Viagem",
    currency: "BRL",
    status: "open",
    createdAt: 0,
    updatedAt: 0,
    participants: [
      { id: "1", name: "Yuri" },
      { id: "2", name: "Rodrigo" },
      { id: "3", name: "Geovane" },
    ],
    expenses: [
      { id: "e1", description: "Combustível", amount: 93.81, paidBy: "1", splitBetween: ["1", "2", "3"], category: "transport", date: "2023-10-24" },
      { id: "e2", description: "Pedágios", amount: 36.95, paidBy: "1", splitBetween: ["1", "2", "3"], category: "transport", date: "2023-10-24" },
      { id: "e3", description: "Estacionamento", amount: 17, paidBy: "3", splitBetween: ["1", "2", "3"], category: "transport", date: "2023-10-23" },
      { id: "e4", description: "Lanche", amount: 66, paidBy: "2", splitBetween: ["1", "2"], category: "food", date: "2023-10-22" },
    ],
    settledPairs: [],
    ...overrides,
  }
}

describe("useEventSummary", () => {
  it("retorna null quando event é undefined", () => {
    const { result } = renderHook(() => useEventSummary(undefined))
    expect(result.current).toBeNull()
  })

  it("totalSpent soma todas as despesas", () => {
    const { result } = renderHook(() => useEventSummary(makeEvent()))
    // 93.81 + 36.95 + 17 + 66 = 213.76
    expect(result.current?.totalSpent).toBe(213.76)
  })

  it("nameOf retorna o nome correto ou '?' para id desconhecido", () => {
    const { result } = renderHook(() => useEventSummary(makeEvent()))
    expect(result.current?.nameOf("1")).toBe("Yuri")
    expect(result.current?.nameOf("2")).toBe("Rodrigo")
    expect(result.current?.nameOf("99")).toBe("?")
  })

  it("settledPct é 0 quando nenhum acerto foi pago", () => {
    const { result } = renderHook(() => useEventSummary(makeEvent()))
    expect(result.current?.settledPct).toBe(0)
  })

  it("settledPct é 50 quando metade dos acertos está paga", () => {
    const event = makeEvent({ settledPairs: ["2->1"] })
    const { result } = renderHook(() => useEventSummary(event))
    expect(result.current?.settledPct).toBe(50)
    expect(result.current?.isFullySettled).toBe(false)
  })

  it("settledPct é 100 e isFullySettled=true quando todos os acertos estão pagos", () => {
    const event = makeEvent({ settledPairs: ["2->1", "3->1"] })
    const { result } = renderHook(() => useEventSummary(event))
    expect(result.current?.settledPct).toBe(100)
    expect(result.current?.isFullySettled).toBe(true)
  })

  it("isFullySettled é false quando não há despesas (nenhum acerto gerado)", () => {
    const event = makeEvent({ expenses: [] })
    const { result } = renderHook(() => useEventSummary(event))
    // settlements.length === 0 → settledPct=100 mas isFullySettled=false
    expect(result.current?.settledPct).toBe(100)
    expect(result.current?.isFullySettled).toBe(false)
  })

  it("pendingTotal soma apenas acertos não pagos", () => {
    const { result } = renderHook(() => useEventSummary(makeEvent()))
    // Rodrigo→Yuri 16.26 + Geovane→Yuri 32.25 = 48.51
    expect(result.current?.pendingTotal).toBe(48.51)
  })

  it("pendingTotal é 0 quando todos os acertos foram pagos", () => {
    const event = makeEvent({ settledPairs: ["2->1", "3->1"] })
    const { result } = renderHook(() => useEventSummary(event))
    expect(result.current?.pendingTotal).toBe(0)
  })

  it("settlements carregam o campo paid correto baseado em settledPairs", () => {
    const event = makeEvent({ settledPairs: ["2->1"] })
    const { result } = renderHook(() => useEventSummary(event))
    const s = result.current?.settlements ?? []
    expect(s.find((t) => t.from === "2" && t.to === "1")?.paid).toBe(true)
    expect(s.find((t) => t.from === "3" && t.to === "1")?.paid).toBe(false)
  })

  it("pendingSettlements exclui acertos já pagos", () => {
    const event = makeEvent({ settledPairs: ["2->1"] })
    const { result } = renderHook(() => useEventSummary(event))
    const pending = result.current?.pendingSettlements ?? []
    expect(pending).toHaveLength(1)
    expect(pending[0].from).toBe("3")
    expect(pending[0].to).toBe("1")
  })

  it("retorna a referência de participants e expenses do evento", () => {
    const event = makeEvent()
    const { result } = renderHook(() => useEventSummary(event))
    expect(result.current?.participants).toBe(event.participants)
    expect(result.current?.expenses).toBe(event.expenses)
  })

  it("net e balances não são nulos", () => {
    const { result } = renderHook(() => useEventSummary(makeEvent()))
    expect(result.current?.net).toBeInstanceOf(Map)
    expect(result.current?.balances.length).toBeGreaterThan(0)
  })
})
