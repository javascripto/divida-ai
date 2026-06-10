import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AppEvent } from "@/lib/types"
import { EventFormDialog } from "./event-form-dialog"

const mocks = vi.hoisted(() => ({ dispatch: vi.fn(), success: vi.fn(), error: vi.fn() }))
vi.mock("@/store/store", () => ({
  useStore: () => ({ dispatch: mocks.dispatch, settings: { defaultCurrency: "BRL" } }), newId: () => "new-event",
}))
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }))

const existing: AppEvent = {
  id: "e1", name: "Antigo", description: "Desc", currency: "USD", status: "closed", createdAt: 1, updatedAt: 1,
  participants: [], expenses: [], settledPairs: [],
}

describe("EventFormDialog", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(Date, "now").mockReturnValue(123) })

  it("valida nome obrigatório e cria evento", async () => {
    const onOpenChange = vi.fn()
    const onCreated = vi.fn()
    const user = userEvent.setup()
    render(<EventFormDialog open onOpenChange={onOpenChange} onCreated={onCreated} />)
    await user.click(screen.getByRole("button", { name: "Salvar" }))
    expect(mocks.error).toHaveBeenCalledWith("Dê um nome ao evento")
    await user.type(screen.getByLabelText("Nome do evento"), "  Festa  ")
    await user.click(screen.getByRole("button", { name: "Festa" }))
    await user.click(screen.getByRole("button", { name: "Salvar" }))
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "ADD_EVENT", payload: expect.objectContaining({
      id: "new-event", name: "Festa", type: "party", currency: "BRL", status: "open", createdAt: 123, updatedAt: 123,
    }) })
    expect(onCreated).toHaveBeenCalledWith("new-event")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("carrega e atualiza evento existente", async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<EventFormDialog open onOpenChange={onOpenChange} event={existing} />)
    const name = screen.getByLabelText("Nome do evento")
    expect(name).toHaveValue("Antigo")
    expect(screen.getByRole("button", { name: "Viagem" })).toHaveAttribute("aria-pressed", "true")
    await user.clear(name)
    await user.type(name, "Atualizado")
    await user.click(screen.getByRole("button", { name: "Salvar" }))
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "UPDATE_EVENT", id: "e1", patch: expect.objectContaining({
      name: "Atualizado", description: "Desc", currency: "USD", status: "closed",
    }) })
    expect(mocks.success).toHaveBeenCalledWith("Evento atualizado")
  })

  it("cancela sem despachar", async () => {
    const onOpenChange = vi.fn()
    render(<EventFormDialog open onOpenChange={onOpenChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })
})
