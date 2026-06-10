import { forwardRef, useImperativeHandle } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AppEvent } from "@/lib/types"
import { AddExpensePage } from "./add-expense"

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  navigate: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  addReceipt: vi.fn(),
  deleteReceipt: vi.fn(),
  event: undefined as AppEvent | undefined,
}))

vi.mock("@/store/store", () => ({
  useStore: () => ({ getEvent: () => mocks.event, dispatch: mocks.dispatch }),
  newId: () => "new-expense",
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return { ...actual, useNavigate: () => mocks.navigate }
})

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}))

vi.mock("@/lib/receipt-db", () => ({
  addReceipt: mocks.addReceipt,
  deleteReceipt: mocks.deleteReceipt,
}))

vi.mock("@/components/receipt-section", () => ({
  ReceiptSection: forwardRef(function ReceiptSection(_props, ref) {
    useImperativeHandle(ref, () => ({
      getChanges: () => ({ keepIds: [], newFiles: [], deletedIds: new Set<string>() }),
    }))
    return <div>Recibos</div>
  }),
}))

function makeEvent(overrides: Partial<AppEvent> = {}): AppEvent {
  return {
    id: "event-1",
    name: "Viagem",
    currency: "BRL",
    status: "open",
    createdAt: 0,
    updatedAt: 0,
    participants: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ],
    expenses: [],
    settledPairs: [],
    ...overrides,
  }
}

function renderPage(path = "/event/event-1/expenses/new") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/event/:eventId/expenses/new" element={<AddExpensePage />} />
        <Route path="/event/:eventId/expenses/:expenseId/edit" element={<AddExpensePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("AddExpensePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.event = makeEvent()
  })

  it("orienta a adicionar participantes quando o evento está vazio", async () => {
    mocks.event = makeEvent({ participants: [] })
    renderPage()

    expect(screen.getByText("Nenhum participante no evento")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: /Adicionar participantes/i }))
    expect(mocks.navigate).toHaveBeenCalledWith("/event/event-1/participants")
  })

  it("valida descrição, valor e ao menos um participante na divisão", async () => {
    const user = userEvent.setup()
    renderPage()
    const save = screen.getByRole("button", { name: /Salvar despesa/i })

    await user.click(save)
    expect(mocks.toastError).toHaveBeenLastCalledWith("Informe uma descrição")

    await user.type(screen.getByLabelText("Descrição"), "Jantar")
    await user.click(save)
    expect(mocks.toastError).toHaveBeenLastCalledWith("Informe um valor válido")

    await user.type(screen.getByLabelText(/Valor/), "90")
    await user.click(screen.getByRole("button", { name: /Alice Participando/i }))
    await user.click(screen.getByRole("button", { name: /Bob Participando/i }))
    await user.click(save)
    expect(mocks.toastError).toHaveBeenLastCalledWith("Selecione ao menos um participante na divisão")
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it("aceita valor com vírgula, atualiza a prévia e cria a despesa", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText("Descrição"), "  Jantar  ")
    await user.type(screen.getByLabelText(/Valor/), "10,50")
    expect(screen.getAllByText("R$ 5,25").length).toBeGreaterThan(0)
    await user.click(screen.getByRole("button", { name: /Salvar despesa/i }))

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "ADD_EXPENSE",
      eventId: "event-1",
      expense: expect.objectContaining({
        id: "new-expense",
        description: "Jantar",
        amount: 10.5,
        paidBy: "alice",
        splitBetween: ["alice", "bob"],
      }),
    })
    expect(mocks.navigate).toHaveBeenCalledWith("/event/event-1/expenses")
  })

  it("permite manter o pagador fora da divisão", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText("Descrição"), "Presente")
    await user.type(screen.getByLabelText(/Valor/), "50")
    await user.click(screen.getByRole("button", { name: /Alice Participando/i }))
    await user.click(screen.getByRole("button", { name: /Salvar despesa/i }))

    expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({
      expense: expect.objectContaining({ paidBy: "alice", splitBetween: ["bob"] }),
    }))
  })

  it("carrega e atualiza uma despesa existente", async () => {
    mocks.event = makeEvent({
      expenses: [{
        id: "expense-1",
        description: "Hotel",
        amount: 200,
        paidBy: "bob",
        splitBetween: ["alice", "bob"],
        category: "stay",
        date: "2026-06-01",
      }],
    })
    const user = userEvent.setup()
    renderPage("/event/event-1/expenses/expense-1/edit")

    const description = screen.getByLabelText("Descrição")
    fireEvent.change(description, { target: { value: "Hotel editado" } })
    await user.click(screen.getByRole("button", { name: /Salvar despesa/i }))

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "UPDATE_EXPENSE",
      eventId: "event-1",
      expense: expect.objectContaining({ id: "expense-1", description: "Hotel editado", amount: 200 }),
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Despesa atualizada")
  })
})
