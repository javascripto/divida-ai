import { createRef } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ReceiptBadge, ReceiptSection, type ReceiptSectionHandle } from "./receipt-section"

const getReceipts = vi.fn()
vi.mock("@/lib/receipt-db", () => ({ getReceiptsByExpense: (...args: unknown[]) => getReceipts(...args) }))

describe("ReceiptSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getReceipts.mockResolvedValue([])
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() })
  })

  it("aceita formatos permitidos e rejeita tipo inválido ou arquivo acima de 10 MB", async () => {
    const ref = createRef<ReceiptSectionHandle>()
    const { container } = render(<ReceiptSection ref={ref} />)
    const input = container.querySelector('input[type="file"]')!
    const valid = new File(["ok"], "ok.png", { type: "image/png" })
    const invalid = new File(["no"], "no.txt", { type: "text/plain" })
    const large = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" })

    fireEvent.change(input, { target: { files: [valid, invalid, large] } })
    await waitFor(() => expect(screen.getByText("ok.png")).toBeVisible())
    expect(screen.queryByText("no.txt")).not.toBeInTheDocument()
    expect(screen.queryByText("large.pdf")).not.toBeInTheDocument()
    expect(ref.current?.getChanges().newFiles).toEqual([valid])
  })

  it("carrega, visualiza e marca recibo existente para remoção", async () => {
    getReceipts.mockResolvedValue([{
      id: "r1", expenseId: "e1", fileName: "nota.pdf", mimeType: "application/pdf", size: 3, data: new Blob(["pdf"]),
    }])
    const ref = createRef<ReceiptSectionHandle>()
    render(<ReceiptSection ref={ref} expenseId="e1" />)
    await userEvent.click(await screen.findByRole("button", { name: "Visualizar nota.pdf" }))
    expect(screen.getByTitle("nota.pdf")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }))
    await userEvent.click(screen.getByRole("button", { name: "Remover recibo" }))
    await userEvent.click(screen.getByRole("button", { name: "Remover" }))
    expect(ref.current?.getChanges().keepIds).toEqual([])
    expect(ref.current?.getChanges().deletedIds).toEqual(new Set(["r1"]))
  })

  it("adiciona arquivos por drag-and-drop", async () => {
    const ref = createRef<ReceiptSectionHandle>()
    render(<ReceiptSection ref={ref} />)
    const area = screen.getByText("Adicionar recibo").closest("div.space-y-3")!.firstElementChild as HTMLElement
    const file = new File(["img"], "drop.webp", { type: "image/webp" })
    fireEvent.dragOver(area)
    fireEvent.drop(area, { dataTransfer: { files: [file] } })
    await waitFor(() => expect(ref.current?.getChanges().newFiles).toEqual([file]))
  })
})

describe("ReceiptBadge", () => {
  it("não renderiza zero e pluraliza a contagem", () => {
    const { rerender } = render(<ReceiptBadge count={0} />)
    expect(screen.queryByTitle(/recibo/)).not.toBeInTheDocument()
    rerender(<ReceiptBadge count={2} />)
    expect(screen.getByTitle("2 recibos")).toBeVisible()
  })
})
