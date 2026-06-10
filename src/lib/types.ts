export type Participant = { id: string; name: string }

export type Transaction = { from: string; to: string; amount: number }

export type ExpenseCategory = "food" | "transport" | "stay" | "other"

export type Expense = {
  id: string
  description: string
  amount: number
  paidBy: string
  splitBetween: string[]
  category: ExpenseCategory
  date: string // ISO date (yyyy-mm-dd)
  notes?: string
  receiptIds?: string[]
}

export type EventStatus = "open" | "closed" | "settled"

export type Settlement = {
  /** Stable id derived from the from/to pair so paid-state survives recalculation. */
  id: string
  from: string
  to: string
  amount: number
  paid: boolean
}

export type AppEvent = {
  id: string
  name: string
  description?: string
  startDate?: string
  endDate?: string
  currency: string
  status: EventStatus
  createdAt: number
  updatedAt: number
  participants: Participant[]
  expenses: Expense[]
  /** Manual paid-state overrides, keyed by `${from}->${to}`. */
  settledPairs: string[]
}
