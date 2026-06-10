import { openDB, type IDBPDatabase } from "idb"

export type ReceiptRecord = {
  id: string
  expenseId: string
  fileName: string
  mimeType: string
  size: number
  data: Blob
}

const DB_NAME = "divida-ai-receipts"
const DB_VERSION = 1
const STORE = "receipts"

let db: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!db) {
    db = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const store = database.createObjectStore(STORE, { keyPath: "id" })
        store.createIndex("expenseId", "expenseId")
      },
    })
  }
  return db
}

export async function addReceipt(expenseId: string, file: File): Promise<ReceiptRecord> {
  const record: ReceiptRecord = {
    id: crypto.randomUUID(),
    expenseId,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    data: file,
  }
  const database = await getDB()
  await database.add(STORE, record)
  return record
}

export async function getReceipt(id: string): Promise<ReceiptRecord | undefined> {
  const database = await getDB()
  return database.get(STORE, id)
}

export async function getReceiptsByExpense(expenseId: string): Promise<ReceiptRecord[]> {
  const database = await getDB()
  return database.getAllFromIndex(STORE, "expenseId", expenseId)
}

export async function deleteReceipt(id: string): Promise<void> {
  const database = await getDB()
  await database.delete(STORE, id)
}

export async function deleteReceiptsByExpense(expenseId: string): Promise<void> {
  const database = await getDB()
  const tx = database.transaction(STORE, "readwrite")
  const keys = await tx.store.index("expenseId").getAllKeys(expenseId)
  await Promise.all(keys.map((k) => tx.store.delete(k)))
  await tx.done
}

export async function deleteReceiptsByExpenses(expenseIds: string[]): Promise<void> {
  if (expenseIds.length === 0) return
  await Promise.all(expenseIds.map(deleteReceiptsByExpense))
}

export async function getAllReceipts(): Promise<ReceiptRecord[]> {
  const database = await getDB()
  return database.getAll(STORE)
}

export async function putReceipt(record: ReceiptRecord): Promise<void> {
  const database = await getDB()
  await database.put(STORE, record)
}

export async function clearAllReceipts(): Promise<void> {
  const database = await getDB()
  await database.clear(STORE)
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mimeType })
}
