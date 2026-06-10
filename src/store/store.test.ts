import { beforeEach, describe, expect, it, vi } from "vitest"
import { defaultSettings, type PersistedState } from "@/lib/storage"
import type { AppEvent, Expense } from "@/lib/types"
import { reducer } from "./store"

const participant = (id: string) => ({ id, name: id })

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense-1",
    description: "Jantar",
    amount: 90,
    paidBy: "alice",
    splitBetween: ["alice", "bob", "carol"],
    category: "food",
    date: "2026-06-10",
    ...overrides,
  }
}

function event(overrides: Partial<AppEvent> = {}): AppEvent {
  return {
    id: "event-1",
    name: "Viagem",
    currency: "BRL",
    status: "open",
    createdAt: 100,
    updatedAt: 100,
    participants: [participant("alice"), participant("bob"), participant("carol")],
    expenses: [expense()],
    settledPairs: ["bob->alice"],
    ...overrides,
  }
}

function state(overrides: Partial<PersistedState> = {}): PersistedState {
  return { events: [event()], settings: defaultSettings, ...overrides }
}

describe("store reducer", () => {
  beforeEach(() => vi.spyOn(Date, "now").mockReturnValue(500))

  it("duplica evento sem compartilhar recibos nem estado de pagamentos", () => {
    const original = event({
      expenses: [expense({ receiptIds: ["receipt-1"] })],
      status: "settled",
    })
    const result = reducer(state({ events: [original] }), {
      type: "DUPLICATE_EVENT",
      id: original.id,
      newId: "event-copy",
    })

    expect(result.events[0]).toMatchObject({
      id: "event-copy",
      name: "Viagem (cópia)",
      status: "open",
      settledPairs: [],
      createdAt: 500,
      updatedAt: 500,
    })
    expect(result.events[0].expenses[0].receiptIds).toBeUndefined()
    expect(result.events[0].expenses).not.toBe(original.expenses)
    expect(result.events[1]).toBe(original)
  })

  it("não altera o estado ao tentar duplicar evento inexistente", () => {
    const initial = state()
    expect(reducer(initial, { type: "DUPLICATE_EVENT", id: "missing", newId: "copy" })).toBe(initial)
  })

  it("remove participante, despesas pagas por ele e sua presença nos rateios", () => {
    const paidByBob = expense({ id: "bob-expense", paidBy: "bob" })
    const paidByAlice = expense({ id: "alice-expense", paidBy: "alice" })
    const result = reducer(state({ events: [event({ expenses: [paidByBob, paidByAlice] })] }), {
      type: "DELETE_PARTICIPANT",
      eventId: "event-1",
      participantId: "bob",
    })

    expect(result.events[0].participants.map((p) => p.id)).toEqual(["alice", "carol"])
    expect(result.events[0].expenses).toEqual([
      expect.objectContaining({ id: "alice-expense", splitBetween: ["alice", "carol"] }),
    ])
  })

  it.each([
    { type: "ADD_EXPENSE" as const, expense: expense({ id: "new" }) },
    { type: "UPDATE_EXPENSE" as const, expense: expense({ description: "Editada" }) },
  ])("atualiza updatedAt ao executar $type", (action) => {
    const result = reducer(state(), { ...action, eventId: "event-1" })
    expect(result.events[0].updatedAt).toBe(500)
  })

  it("alterna pagamento sem criar pares duplicados", () => {
    const initial = state({ events: [event({ settledPairs: [] })] })
    const paid = reducer(initial, { type: "TOGGLE_SETTLED_PAIR", eventId: "event-1", pairId: "bob->alice" })
    const pending = reducer(paid, { type: "TOGGLE_SETTLED_PAIR", eventId: "event-1", pairId: "bob->alice" })
    const paidAgain = reducer(pending, { type: "TOGGLE_SETTLED_PAIR", eventId: "event-1", pairId: "bob->alice" })

    expect(paid.events[0].settledPairs).toEqual(["bob->alice"])
    expect(pending.events[0].settledPairs).toEqual([])
    expect(paidAgain.events[0].settledPairs).toEqual(["bob->alice"])
  })

  it("mantém eventos intactos quando o eventId não existe", () => {
    const initial = state()
    const result = reducer(initial, {
      type: "ADD_EXPENSE",
      eventId: "missing",
      expense: expense({ id: "new" }),
    })
    expect(result.events).toEqual(initial.events)
    expect(result.events[0]).toBe(initial.events[0])
  })
})
