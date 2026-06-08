import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react"
import type { AppEvent, Expense, Participant } from "@/lib/types"
import {
  defaultSettings,
  loadState,
  newId,
  saveState,
  seedState,
  type AppSettings,
  type PersistedState,
} from "@/lib/storage"

type Action =
  | { type: "REPLACE_ALL"; payload: PersistedState }
  | { type: "ADD_EVENT"; payload: AppEvent }
  | { type: "UPDATE_EVENT"; id: string; patch: Partial<AppEvent> }
  | { type: "DELETE_EVENT"; id: string }
  | { type: "DUPLICATE_EVENT"; id: string; newId: string }
  | { type: "ADD_PARTICIPANT"; eventId: string; participant: Participant }
  | { type: "UPDATE_PARTICIPANT"; eventId: string; participant: Participant }
  | { type: "DELETE_PARTICIPANT"; eventId: string; participantId: string }
  | { type: "ADD_EXPENSE"; eventId: string; expense: Expense }
  | { type: "UPDATE_EXPENSE"; eventId: string; expense: Expense }
  | { type: "DELETE_EXPENSE"; eventId: string; expenseId: string }
  | { type: "TOGGLE_SETTLED_PAIR"; eventId: string; pairId: string }
  | { type: "UPDATE_SETTINGS"; patch: Partial<AppSettings> }

const touch = (e: AppEvent): AppEvent => ({ ...e, updatedAt: Date.now() })

function mapEvent(state: PersistedState, id: string, fn: (e: AppEvent) => AppEvent): PersistedState {
  return { ...state, events: state.events.map((e) => (e.id === id ? touch(fn(e)) : e)) }
}

function reducer(state: PersistedState, action: Action): PersistedState {
  switch (action.type) {
    case "REPLACE_ALL":
      return action.payload
    case "ADD_EVENT":
      return { ...state, events: [action.payload, ...state.events] }
    case "UPDATE_EVENT":
      return mapEvent(state, action.id, (e) => ({ ...e, ...action.patch }))
    case "DELETE_EVENT":
      return { ...state, events: state.events.filter((e) => e.id !== action.id) }
    case "DUPLICATE_EVENT": {
      const src = state.events.find((e) => e.id === action.id)
      if (!src) return state
      const copy: AppEvent = {
        ...structuredClone(src),
        id: action.newId,
        name: `${src.name} (cópia)`,
        status: "open",
        settledPairs: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      return { ...state, events: [copy, ...state.events] }
    }
    case "ADD_PARTICIPANT":
      return mapEvent(state, action.eventId, (e) => ({
        ...e,
        participants: [...e.participants, action.participant],
      }))
    case "UPDATE_PARTICIPANT":
      return mapEvent(state, action.eventId, (e) => ({
        ...e,
        participants: e.participants.map((p) =>
          p.id === action.participant.id ? action.participant : p,
        ),
      }))
    case "DELETE_PARTICIPANT":
      return mapEvent(state, action.eventId, (e) => ({
        ...e,
        participants: e.participants.filter((p) => p.id !== action.participantId),
        // remove das despesas também
        expenses: e.expenses
          .filter((ex) => ex.paidBy !== action.participantId)
          .map((ex) => ({
            ...ex,
            splitBetween: ex.splitBetween.filter((id) => id !== action.participantId),
          })),
      }))
    case "ADD_EXPENSE":
      return mapEvent(state, action.eventId, (e) => ({
        ...e,
        expenses: [action.expense, ...e.expenses],
      }))
    case "UPDATE_EXPENSE":
      return mapEvent(state, action.eventId, (e) => ({
        ...e,
        expenses: e.expenses.map((ex) => (ex.id === action.expense.id ? action.expense : ex)),
      }))
    case "DELETE_EXPENSE":
      return mapEvent(state, action.eventId, (e) => ({
        ...e,
        expenses: e.expenses.filter((ex) => ex.id !== action.expenseId),
      }))
    case "TOGGLE_SETTLED_PAIR":
      return mapEvent(state, action.eventId, (e) => ({
        ...e,
        settledPairs: e.settledPairs.includes(action.pairId)
          ? e.settledPairs.filter((p) => p !== action.pairId)
          : [...e.settledPairs, action.pairId],
      }))
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.patch } }
    default:
      return state
  }
}

type StoreValue = {
  events: AppEvent[]
  settings: AppSettings
  dispatch: React.Dispatch<Action>
  getEvent: (id: string) => AppEvent | undefined
  exportJSON: () => string
  importJSON: (json: string) => boolean
  resetAll: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const value = useMemo<StoreValue>(() => {
    const getEvent = (id: string) => state.events.find((e) => e.id === id)
    return {
      events: state.events,
      settings: state.settings,
      dispatch,
      getEvent,
      exportJSON: () => JSON.stringify(state, null, 2),
      importJSON: (json: string) => {
        try {
          const parsed = JSON.parse(json) as PersistedState
          if (!Array.isArray(parsed.events)) return false
          dispatch({
            type: "REPLACE_ALL",
            payload: { events: parsed.events, settings: { ...defaultSettings, ...parsed.settings } },
          })
          return true
        } catch {
          return false
        }
      },
      resetAll: () => dispatch({ type: "REPLACE_ALL", payload: seedState() }),
    }
  }, [state])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore deve ser usado dentro de <StoreProvider>")
  return ctx
}

export { newId }
