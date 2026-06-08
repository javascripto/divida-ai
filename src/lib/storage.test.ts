import { beforeEach, describe, expect, it } from "vitest"
import { loadState, saveState, clearState, seedState, defaultSettings } from "./storage"

describe("storage (localStorage round-trip)", () => {
  beforeEach(() => localStorage.clear())

  it("seedState inicia vazio (sem eventos) com os settings padrão", () => {
    const seed = seedState()
    expect(seed.events).toHaveLength(0)
    expect(seed.settings).toEqual(defaultSettings)
  })

  it("loadState retorna o seed vazio quando não há nada salvo", () => {
    const state = loadState()
    expect(state.events).toHaveLength(0)
  })

  it("persiste e recarrega o estado", () => {
    const state = seedState()
    state.events.push({
      id: "ev1",
      name: "Minha viagem editada",
      currency: "BRL",
      status: "open",
      createdAt: 0,
      updatedAt: 0,
      participants: [],
      expenses: [],
      settledPairs: [],
    })
    saveState(state)
    const reloaded = loadState()
    expect(reloaded.events[0].name).toBe("Minha viagem editada")
  })

  it("mescla settings parciais com os padrões", () => {
    saveState({ events: [], settings: { defaultCurrency: "USD" } as never })
    const reloaded = loadState()
    expect(reloaded.settings.defaultCurrency).toBe("USD")
    expect(reloaded.settings.theme).toBe(defaultSettings.theme)
  })

  it("recupera-se de JSON corrompido voltando ao seed vazio", () => {
    localStorage.setItem("conta-certa:state:v1", "{not valid json")
    const state = loadState()
    expect(state.events).toHaveLength(0)
  })

  it("clearState remove os dados", () => {
    saveState(seedState())
    clearState()
    expect(localStorage.getItem("conta-certa:state:v1")).toBeNull()
  })
})
