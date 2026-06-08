import type { AppEvent } from "./types"

const STORAGE_KEY = "conta-certa:state:v1"

export type AppSettings = {
  defaultCurrency: string
  theme: "light" | "dark" | "system"
}

export type PersistedState = {
  events: AppEvent[]
  settings: AppSettings
}

export const defaultSettings: AppSettings = {
  defaultCurrency: "BRL",
  theme: "system",
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export const newId = uid

/** Evento de exemplo (a viagem do rateio.ts original). */
export function seedState(): PersistedState {
  const now = Date.now()
  const event: AppEvent = {
    id: uid(),
    name: "Viagem",
    description: "Viagem a Florianópolis",
    startDate: "2023-10-12",
    currency: "BRL",
    status: "open",
    createdAt: now - 1000 * 60 * 60 * 2,
    updatedAt: now - 1000 * 60 * 60 * 2,
    participants: [
      { id: "1", name: "Yuri" },
      { id: "2", name: "Rodrigo" },
      { id: "3", name: "Geovane" },
    ],
    expenses: [
      { id: "e1", description: "Combustível", amount: 93.81, paidBy: "1", splitBetween: ["1", "2", "3"], category: "transport", date: "2023-10-24" },
      { id: "e2", description: "Pedágios", amount: 36.95, paidBy: "1", splitBetween: ["1", "2", "3"], category: "transport", date: "2023-10-24" },
      { id: "e3", description: "Estacionamento", amount: 17, paidBy: "3", splitBetween: ["1", "2", "3"], category: "transport", date: "2023-10-23" },
      { id: "e4", description: "Lanche", amount: 66, paidBy: "2", splitBetween: ["1", "2"], category: "food", date: "2023-10-22" },
    ],
    settledPairs: [],
  }
  return { events: [], settings: defaultSettings }
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedState()
    const parsed = JSON.parse(raw) as PersistedState
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      settings: { ...defaultSettings, ...parsed.settings },
    }
  } catch {
    return seedState()
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage cheio ou indisponível — ignora silenciosamente
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export const STORAGE_KEY_EXPORT = STORAGE_KEY
