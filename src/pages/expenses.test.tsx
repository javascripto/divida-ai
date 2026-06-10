import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AppEvent } from "@/lib/types"
import { ExpensesPage } from "./expenses"

const mocks = vi.hoisted(() => ({ event: undefined as AppEvent | undefined, dispatch: vi.fn(), navigate: vi.fn(), deleted: vi.fn(), success: vi.fn() }))
vi.mock("@/store/store", () => ({ useStore: () => ({ getEvent: () => mocks.event, dispatch: mocks.dispatch }) }))
vi.mock("react-router-dom", async () => ({ ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")), useNavigate: () => mocks.navigate }))
vi.mock("@/lib/receipt-db", () => ({ deleteReceiptsByExpense: mocks.deleted }))
vi.mock("sonner", () => ({ toast: { success: mocks.success } }))

const makeEvent = (participants = [{ id: "a", name: "Alice" }, { id: "b", name: "Bob" }]): AppEvent => ({
  id: "e1", name: "Viagem", currency: "BRL", status: "open", createdAt: 0, updatedAt: 0, participants,
  expenses: [
    { id: "x1", description: "Hotel", amount: 200, paidBy: "a", splitBetween: ["a", "b"], category: "stay", date: "2026-06-01", receiptIds: ["r1"] },
    { id: "x2", description: "Jantar", amount: 100, paidBy: "b", splitBetween: ["a", "b"], category: "food", date: "2026-06-02" },
  ], settledPairs: [],
})
const renderPage = () => render(<MemoryRouter initialEntries={["/event/e1/expenses"]}><Routes><Route path="/event/:eventId/expenses" element={<ExpensesPage />} /><Route path="/" element={<div>Início</div>} /></Routes></MemoryRouter>)

describe("ExpensesPage", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.event = makeEvent() })

  it("lista, busca e navega para edição", async () => {
    renderPage()
    expect(screen.getByText("Hotel")).toBeVisible()
    await userEvent.type(screen.getByPlaceholderText(/Buscar despesas/), "jant")
    expect(screen.queryByText("Hotel")).not.toBeInTheDocument()
    expect(screen.getByText("Jantar")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Editar despesa" }))
    expect(mocks.navigate).toHaveBeenCalledWith("/event/e1/expenses/x2/edit")
  })

  it("exclui despesa e recibos", async () => {
    renderPage()
    const buttons = screen.getAllByRole("button", { name: "Excluir despesa" })
    await userEvent.click(buttons[0])
    expect(mocks.deleted).toHaveBeenCalledWith("x1")
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "DELETE_EXPENSE", eventId: "e1", expenseId: "x1" })
  })

  it("direciona evento sem participantes para cadastro", async () => {
    mocks.event = makeEvent([])
    mocks.event.expenses = []
    renderPage()
    await userEvent.click(screen.getByRole("button", { name: /Adicionar participantes/ }))
    expect(mocks.navigate).toHaveBeenCalledWith("/event/e1/participants")
  })

  it("redireciona quando o evento não existe", () => {
    mocks.event = undefined
    renderPage()
    expect(screen.getByText("Início")).toBeVisible()
  })
})
