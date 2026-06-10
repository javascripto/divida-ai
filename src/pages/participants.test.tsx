import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AppEvent } from "@/lib/types"
import { ParticipantsPage } from "./participants"

const mocks = vi.hoisted(() => ({ event: undefined as AppEvent | undefined, dispatch: vi.fn(), success: vi.fn(), error: vi.fn() }))
vi.mock("@/store/store", () => ({ useStore: () => ({ getEvent: () => mocks.event, dispatch: mocks.dispatch }), newId: () => "new-p" }))
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }))

const event: AppEvent = {
  id: "e1", name: "Viagem", currency: "BRL", status: "open", createdAt: 0, updatedAt: 0,
  participants: [{ id: "a", name: "Alice" }, { id: "b", name: "Bob" }],
  expenses: [{ id: "x", description: "Hotel", amount: 100, paidBy: "a", splitBetween: ["a", "b"], category: "stay", date: "2026-06-01" }],
  settledPairs: [],
}
const renderPage = () => render(<MemoryRouter initialEntries={["/event/e1/participants"]}><Routes><Route path="/event/:eventId/participants" element={<ParticipantsPage />} /><Route path="/" element={<div>Início</div>} /></Routes></MemoryRouter>)

describe("ParticipantsPage", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.event = event })

  it("valida e adiciona participante com nome normalizado", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole("button", { name: /Adicionar participante/ }))
    await user.click(screen.getByRole("button", { name: "Adicionar" }))
    expect(mocks.error).toHaveBeenCalledWith("Informe o nome")
    await user.type(screen.getByLabelText("Nome"), "  Carol  ")
    await user.click(screen.getByRole("button", { name: "Adicionar" }))
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "ADD_PARTICIPANT", eventId: "e1", participant: { id: "new-p", name: "Carol" } })
  })

  it("remove participante após confirmação", async () => {
    renderPage()
    await userEvent.click(screen.getAllByRole("button", { name: "Remover participante" })[1])
    expect(screen.getByText("Remover Bob?")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Remover" }))
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "DELETE_PARTICIPANT", eventId: "e1", participantId: "b" })
    expect(mocks.success).toHaveBeenCalledWith("Participante removido")
  })

  it("exibe classificação de credor e devedor", () => {
    renderPage()
    expect(screen.getByText("CREDOR")).toBeVisible()
    expect(screen.getByText("DEVEDOR")).toBeVisible()
  })

  it("redireciona evento inexistente", () => {
    mocks.event = undefined
    renderPage()
    expect(screen.getByText("Início")).toBeVisible()
  })
})
