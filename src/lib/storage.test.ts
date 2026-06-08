import { beforeEach, describe, expect, it } from "vitest"
import { loadState, saveState, clearState, seedState, defaultSettings } from "./storage"

describe("storage (localStorage round-trip)", () => {
  beforeEach(() => localStorage.clear())

  it("seedState traz a viagem de exemplo com 4 despesas e 3 participantes", () => {
    const seed = seedState()
    expect(seed.events).toHaveLength(1)
    expect(seed.events[0].expenses).toHaveLength(4)
    expect(seed.events[0].participants).toHaveLength(3)
    expect(seed.settings).toEqual(defaultSettings)
  })

  it("loadState retorna o seed quando não há nada salvo", () => {
    const state = loadState()
    expect(state.events).toHaveLength(1)
    expect(state.events[0].name).toBe("Viagem")
  })

  it("persiste e recarrega o estado", () => {
    const state = seedState()
    state.events[0].name = "Minha viagem editada"
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

  it("recupera-se de JSON corrompido voltando ao seed", () => {
    localStorage.setItem("conta-certa:state:v1", "{not valid json")
    const state = loadState()
    expect(state.events).toHaveLength(1)
  })

  it("clearState remove os dados", () => {
    saveState(seedState())
    clearState()
    expect(localStorage.getItem("conta-certa:state:v1")).toBeNull()
  })
})
