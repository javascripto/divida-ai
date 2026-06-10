import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SettingsPage } from "./settings"

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(), exportJSON: vi.fn(), importJSON: vi.fn(), resetAll: vi.fn(), setTheme: vi.fn(),
  getAllReceipts: vi.fn(), clearAllReceipts: vi.fn(), putReceipt: vi.fn(), blobToBase64: vi.fn(), base64ToBlob: vi.fn(),
  success: vi.fn(), error: vi.fn(),
}))
vi.mock("@/store/store", () => ({ useStore: () => ({
  settings: { defaultCurrency: "BRL", theme: "light" }, dispatch: mocks.dispatch,
  exportJSON: mocks.exportJSON, importJSON: mocks.importJSON, resetAll: mocks.resetAll,
}) }))
vi.mock("@/components/theme-provider", () => ({ useTheme: () => ({ theme: "light", setTheme: mocks.setTheme }) }))
vi.mock("@/lib/receipt-db", () => ({
  getAllReceipts: mocks.getAllReceipts, clearAllReceipts: mocks.clearAllReceipts, putReceipt: mocks.putReceipt,
  blobToBase64: mocks.blobToBase64, base64ToBlob: mocks.base64ToBlob,
}))
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }))

function fileWithText(name: string, text: string) {
  const file = new File([text], name, { type: "application/json" })
  Object.defineProperty(file, "text", { value: () => Promise.resolve(text) })
  return file
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.exportJSON.mockReturnValue(JSON.stringify({ events: [], settings: {} }))
    mocks.importJSON.mockReturnValue(true)
    mocks.getAllReceipts.mockResolvedValue([])
    mocks.clearAllReceipts.mockResolvedValue(undefined)
    mocks.putReceipt.mockResolvedValue(undefined)
    mocks.blobToBase64.mockResolvedValue("YWJj")
    mocks.base64ToBlob.mockReturnValue(new Blob(["abc"]))
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:download"), revokeObjectURL: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  })

  it("exporta JSON sem recibos", async () => {
    render(<SettingsPage />)
    await userEvent.click(screen.getByRole("button", { name: /Exportar dados/ }))
    await userEvent.click(screen.getByRole("button", { name: /Só dados/ }))
    expect(mocks.exportJSON).toHaveBeenCalled()
    expect(mocks.success).toHaveBeenCalledWith("Backup exportado (sem recibos)")
  })

  it("exporta JSON com recibos em base64", async () => {
    mocks.getAllReceipts.mockResolvedValue([{
      id: "r1", expenseId: "e1", fileName: "nota.pdf", mimeType: "application/pdf", size: 3, data: new Blob(["abc"]),
    }])
    render(<SettingsPage />)
    await userEvent.click(screen.getByRole("button", { name: /Exportar dados/ }))
    await userEvent.click(screen.getByRole("button", { name: /JSON com recibos/ }))
    await waitFor(() => expect(mocks.blobToBase64).toHaveBeenCalled())
    expect(mocks.success).toHaveBeenCalledWith("Backup exportado com 1 recibo(s) em base64")
  })

  it("importa JSON com recibos e restaura o banco", async () => {
    const payload = JSON.stringify({ events: [], settings: {}, receipts: [{
      id: "r1", expenseId: "e1", fileName: "nota.pdf", mimeType: "application/pdf", size: 3, data: "YWJj",
    }] })
    const { container } = render(<SettingsPage />)
    const input = container.querySelector('input[type="file"]')!
    fireEvent.change(input, { target: { files: [fileWithText("backup.json", payload)] } })
    await waitFor(() => expect(mocks.putReceipt).toHaveBeenCalledWith(expect.objectContaining({ id: "r1", expenseId: "e1" })))
    expect(mocks.clearAllReceipts).toHaveBeenCalled()
    expect(mocks.importJSON).toHaveBeenCalledWith(expect.not.stringContaining("receipts"))
    expect(mocks.success).toHaveBeenCalledWith("Dados importados com 1 recibo(s)")
  })

  it("rejeita JSON sem eventos", async () => {
    const { container } = render(<SettingsPage />)
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [fileWithText("invalid.json", JSON.stringify({ settings: {} }))] },
    })
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Arquivo inválido"))
    expect(mocks.clearAllReceipts).not.toHaveBeenCalled()
  })

  it("limpa recibos e reseta os dados após confirmação", async () => {
    render(<SettingsPage />)
    await userEvent.click(screen.getByRole("button", { name: /Limpar todos os dados/ }))
    await userEvent.click(screen.getByRole("button", { name: "Limpar" }))
    await waitFor(() => expect(mocks.resetAll).toHaveBeenCalled())
    expect(mocks.clearAllReceipts).toHaveBeenCalled()
    expect(mocks.success).toHaveBeenCalledWith("Dados restaurados")
  })
})
