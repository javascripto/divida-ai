import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AppEvent } from "@/lib/types"
import { SettlementsPage } from "./settlements"

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(), success: vi.fn(), error: vi.fn(), writeText: vi.fn(), event: undefined as AppEvent | undefined,
}))
vi.mock("@/store/store", () => ({ useStore: () => ({ getEvent: () => mocks.event, dispatch: mocks.dispatch }) }))
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }))

const event = (settledPairs: string[] = []): AppEvent => ({
  id: "e1", name: "Viagem", currency: "BRL", status: "open", createdAt: 0, updatedAt: 0,
  participants: [{ id: "a", name: "Alice" }, { id: "b", name: "Bob" }],
  expenses: [{ id: "x", description: "Jantar", amount: 100, paidBy: "a", splitBetween: ["a", "b"], category: "food", date: "2026-01-01" }],
  settledPairs,
})

function renderPage() {
  return render(<MemoryRouter initialEntries={["/event/e1/settlements"]}><Routes>
    <Route path="/event/:eventId/settlements" element={<SettlementsPage />} />
    <Route path="/" element={<div>Início</div>} />
  </Routes></MemoryRouter>)
}

describe("SettlementsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.event = event()
    mocks.writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: mocks.writeText } })
  })

  it("marca pagamento, abre detalhes e copia o resumo", async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: mocks.writeText } })
    renderPage()
    await user.click(screen.getByRole("button", { name: "Marcar como pago" }))
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "TOGGLE_SETTLED_PAIR", eventId: "e1", pairId: "b->a" })
    await user.click(screen.getByRole("button", { name: /Ver detalhes/ }))
    expect(screen.getByText(/Saldo líquido de cada participante/)).toBeVisible()
    await user.click(screen.getByRole("button", { name: /Copiar detalhes/ }))
    expect(mocks.writeText).toHaveBeenCalledWith(expect.stringMatching(/Bob → Alice: R\$\s50,00/))
    expect(mocks.success).toHaveBeenCalledWith("Detalhes copiados para a área de transferência")
  })

  it("reverte pagamento e mostra estado quitado", async () => {
    mocks.event = event(["b->a"])
    renderPage()
    expect(screen.getByText(/Todos os pagamentos foram quitados/)).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: /Reverter/ }))
    expect(mocks.success).toHaveBeenCalledWith("Marcado como pendente")
  })

  it("informa falha ao copiar", async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: mocks.writeText } })
    mocks.writeText.mockRejectedValueOnce(new Error("denied"))
    renderPage()
    await user.click(screen.getByRole("button", { name: /Copiar detalhes/ }))
    expect(mocks.error).toHaveBeenCalledWith("Não foi possível copiar")
  })

  it("mostra estado vazio e redireciona evento inexistente", () => {
    mocks.event = event()
    mocks.event.expenses = []
    const { unmount } = renderPage()
    expect(screen.getByText(/Não há nada a acertar/)).toBeVisible()
    unmount()
    mocks.event = undefined
    renderPage()
    expect(screen.getByText("Início")).toBeVisible()
  })
})
