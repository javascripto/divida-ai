import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AppEvent } from "@/lib/types"
import { EventsPage } from "./events"

const mocks = vi.hoisted(() => ({ events: [] as AppEvent[], dispatch: vi.fn(), navigate: vi.fn(), deleted: vi.fn(), success: vi.fn() }))
vi.mock("@/store/store", () => ({
  useStore: () => ({ events: mocks.events, dispatch: mocks.dispatch, settings: { defaultCurrency: "BRL", theme: "light" } }),
  newId: () => "copy-id",
}))
vi.mock("react-router-dom", async () => ({ ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")), useNavigate: () => mocks.navigate }))
vi.mock("@/lib/receipt-db", () => ({ deleteReceiptsByExpenses: mocks.deleted }))
vi.mock("sonner", () => ({ toast: { success: mocks.success } }))

const event: AppEvent = {
  id: "e1", name: "Viagem", currency: "BRL", status: "open", createdAt: 0, updatedAt: Date.now(), startDate: "2026-06-01",
  participants: [{ id: "a", name: "Alice" }],
  expenses: [{ id: "x", description: "Hotel", amount: 200, paidBy: "a", splitBetween: ["a"], category: "stay", date: "2026-06-01", receiptIds: ["r1"] }],
  settledPairs: [],
}

describe("EventsPage", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.events = [] })
  const renderPage = () => render(<MemoryRouter><EventsPage /></MemoryRouter>)

  it("mostra estado vazio e abre criação", async () => {
    renderPage()
    expect(screen.getByText("Nenhum evento ainda.")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: /Criar seu primeiro evento/ }))
    expect(screen.getByRole("dialog", { name: "Novo evento" })).toBeVisible()
  })

  it("abre, duplica e exclui evento com seus recibos", async () => {
    mocks.events = [event]
    renderPage()
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }))
    expect(mocks.navigate).toHaveBeenCalledWith("/event/e1")
    await userEvent.click(screen.getByRole("button", { name: "Duplicar" }))
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "DUPLICATE_EVENT", id: "e1", newId: "copy-id" })
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }))
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }))
    expect(mocks.deleted).toHaveBeenCalledWith(["x"])
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "DELETE_EVENT", id: "e1" })
  })

  it("abre o formulário de edição", async () => {
    mocks.events = [event]
    renderPage()
    await userEvent.click(screen.getByRole("button", { name: "Editar" }))
    expect(screen.getByRole("dialog", { name: "Editar evento" })).toBeVisible()
    expect(screen.getByLabelText("Nome do evento")).toHaveValue("Viagem")
  })

  it("mostra o ícone correspondente ao tipo do evento", () => {
    mocks.events = [{ ...event, name: "Churrasco", type: "barbecue" }]
    renderPage()
    expect(screen.getByLabelText("Tipo: Churrasco")).toBeVisible()
  })

  it("usa o ícone de viagem para eventos antigos sem tipo", () => {
    mocks.events = [event]
    renderPage()
    expect(screen.getByLabelText("Tipo: Viagem")).toBeVisible()
  })
})
