import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it } from "vitest"
import {
  addReceipt,
  base64ToBlob,
  blobToBase64,
  clearAllReceipts,
  deleteReceipt,
  deleteReceiptsByExpense,
  deleteReceiptsByExpenses,
  getAllReceipts,
  getReceipt,
  getReceiptsByExpense,
  putReceipt,
} from "./receipt-db"

describe("receipt-db", () => {
  beforeEach(async () => clearAllReceipts())

  it("adiciona, consulta e exclui um recibo", async () => {
    const file = new File(["image-data"], "receipt.png", { type: "image/png" })
    const added = await addReceipt("expense-1", file)

    expect(await getReceipt(added.id)).toMatchObject({
      expenseId: "expense-1",
      fileName: "receipt.png",
      mimeType: "image/png",
      size: file.size,
    })
    await deleteReceipt(added.id)
    expect(await getReceipt(added.id)).toBeUndefined()
  })

  it("consulta e exclui somente recibos da despesa informada", async () => {
    await addReceipt("expense-1", new File(["a"], "a.pdf", { type: "application/pdf" }))
    await addReceipt("expense-1", new File(["b"], "b.pdf", { type: "application/pdf" }))
    await addReceipt("expense-2", new File(["c"], "c.pdf", { type: "application/pdf" }))

    expect(await getReceiptsByExpense("expense-1")).toHaveLength(2)
    await deleteReceiptsByExpense("expense-1")
    expect(await getReceiptsByExpense("expense-1")).toEqual([])
    expect(await getReceiptsByExpense("expense-2")).toHaveLength(1)
  })

  it("exclui recibos de várias despesas e aceita lista vazia", async () => {
    await addReceipt("expense-1", new File(["a"], "a.png", { type: "image/png" }))
    await addReceipt("expense-2", new File(["b"], "b.png", { type: "image/png" }))
    await addReceipt("expense-3", new File(["c"], "c.png", { type: "image/png" }))

    await deleteReceiptsByExpenses([])
    await deleteReceiptsByExpenses(["expense-1", "expense-2"])
    expect((await getAllReceipts()).map((r) => r.expenseId)).toEqual(["expense-3"])
  })

  it("putReceipt restaura um registro exportado", async () => {
    const record = {
      id: "restored",
      expenseId: "expense-1",
      fileName: "restored.pdf",
      mimeType: "application/pdf",
      size: 3,
      data: new Blob(["pdf"], { type: "application/pdf" }),
    }
    await putReceipt(record)
    expect(await getReceipt("restored")).toMatchObject(record)
  })

  it("preserva os bytes e o MIME type no round-trip base64", async () => {
    const original = new Blob([new Uint8Array([0, 1, 2, 127, 255])], { type: "application/octet-stream" })
    const encoded = await blobToBase64(original)
    const restored = base64ToBlob(encoded, original.type)

    expect(restored.type).toBe(original.type)
    expect(await blobToBase64(restored)).toBe(encoded)
  })
})
