import { describe, expect, it } from "vitest"
import { formatMoney, formatDate, relativeTime } from "./format"

describe("formatMoney", () => {
  it("formata em BRL por padrão", () => {
    //   é o espaço não-quebrável usado pelo Intl
    expect(formatMoney(213.76)).toBe("R$ 213,76")
    expect(formatMoney(16.26, "BRL")).toBe("R$ 16,26")
  })

  it("respeita outras moedas", () => {
    expect(formatMoney(10, "USD")).toBe("$10.00")
  })
})

describe("formatDate", () => {
  it("formata data ISO em pt-BR", () => {
    expect(formatDate("2023-10-12")).toMatch(/12 de out\.? de 2023/)
  })

  it("retorna travessão para vazio/ inválido", () => {
    expect(formatDate(undefined)).toBe("—")
    expect(formatDate("not-a-date")).toBe("—")
  })
})

describe("relativeTime", () => {
  it("descreve intervalos recentes", () => {
    expect(relativeTime(Date.now())).toBe("agora")
    expect(relativeTime(Date.now() - 1000 * 60 * 5)).toBe("5 min atrás")
    expect(relativeTime(Date.now() - 1000 * 60 * 60 * 2)).toBe("2h atrás")
    expect(relativeTime(Date.now() - 1000 * 60 * 60 * 24 * 3)).toBe("3d atrás")
  })
})
