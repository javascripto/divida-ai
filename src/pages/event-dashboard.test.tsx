import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AppEvent } from "@/lib/types"
import { EventDashboardPage } from "./event-dashboard"

const mocks = vi.hoisted(() => ({ event: undefined as AppEvent | undefined, dispatch: vi.fn(), navigate: vi.fn(), success: vi.fn() }))
vi.mock("@/store/store", () => ({ useStore: () => ({ getEvent: () => mocks.event, dispatch: mocks.dispatch }) }))
vi.mock("react-router-dom", async () => ({ ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")), useNavigate: () => mocks.navigate }))
vi.mock("sonner", () => ({ toast: { success: mocks.success } }))

const makeEvent = (settledPairs: string[] = []): AppEvent => ({
  id: "e1", name: "Viagem", currency: "BRL", status: "open", createdAt: 0, updatedAt: 0,
  participants: [{ id: "a", name: "Alice" }, { id: "b", name: "Bob" }],
  expenses: [{ id: "x", description: "Hotel", amount: 100, paidBy: "a", splitBetween: ["a", "b"], category: "stay", date: "2026-06-01" }],
  settledPairs,
})
const renderPage = () => render(<MemoryRouter initialEntries={["/event/e1"]}><Routes><Route path="/event/:eventId" element={<EventDashboardPage />} /><Route path="/" element={<div>Início</div>} /></Routes></MemoryRouter>)

describe("EventDashboardPage", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.event = makeEvent() })

  it("exibe resumo e marca acerto como pago", async () => {
    renderPage()
    expect(screen.getByText("Quem paga quem")).toBeVisible()
    expect(screen.getByText("Bob paga Alice")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Marcar como pago" }))
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "TOGGLE_SETTLED_PAIR", eventId: "e1", pairId: "b->a" })
  })

  it("mostra evento quitado", () => {
    mocks.event = makeEvent(["b->a"])
    renderPage()
    expect(screen.getByText(/Este evento foi quitado/)).toBeVisible()
    expect(screen.getByText(/Nenhum pagamento pendente/)).toBeVisible()
  })

  it("orienta evento vazio a adicionar participantes", async () => {
    mocks.event = makeEvent()
    mocks.event.participants = []
    mocks.event.expenses = []
    renderPage()
    expect(screen.getByText("Sem participantes.")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: /Adicionar participantes/ }))
    expect(mocks.navigate).toHaveBeenCalledWith("/event/e1/participants")
  })

  it("redireciona evento inexistente", () => {
    mocks.event = undefined
    renderPage()
    expect(screen.getByText("Início")).toBeVisible()
  })
})
