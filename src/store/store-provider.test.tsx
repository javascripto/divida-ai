import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { StoreProvider, useStore } from "./store"

const wrapper = ({ children }: { children: React.ReactNode }) => <StoreProvider>{children}</StoreProvider>

describe("StoreProvider", () => {
  beforeEach(() => localStorage.clear())

  it("exporta, consulta e persiste alterações", async () => {
    const { result } = renderHook(() => useStore(), { wrapper })
    act(() => result.current.dispatch({ type: "ADD_EVENT", payload: {
      id: "e1", name: "Teste", currency: "BRL", status: "open", createdAt: 0, updatedAt: 0,
      participants: [], expenses: [], settledPairs: [],
    } }))
    expect(result.current.getEvent("e1")?.name).toBe("Teste")
    expect(JSON.parse(result.current.exportJSON()).events).toHaveLength(1)
    await waitFor(() => expect(localStorage.getItem("divida-ai:state:v1")).toContain("Teste"))
  })

  it("importa JSON, mescla settings e rejeita entradas inválidas", () => {
    const { result } = renderHook(() => useStore(), { wrapper })
    act(() => expect(result.current.importJSON(JSON.stringify({ events: [], settings: { defaultCurrency: "USD" } }))).toBe(true))
    expect(result.current.settings).toMatchObject({ defaultCurrency: "USD", theme: "system" })
    expect(result.current.importJSON("invalid")).toBe(false)
    expect(result.current.importJSON(JSON.stringify({ events: null }))).toBe(false)
  })

  it("reseta o estado", () => {
    const { result } = renderHook(() => useStore(), { wrapper })
    act(() => result.current.dispatch({ type: "UPDATE_SETTINGS", patch: { defaultCurrency: "EUR" } }))
    act(() => result.current.resetAll())
    expect(result.current.events).toEqual([])
    expect(result.current.settings.defaultCurrency).toBe("BRL")
  })

  it("exige uso dentro do provider", () => {
    expect(() => renderHook(() => useStore())).toThrow("useStore deve ser usado dentro de <StoreProvider>")
  })
})
