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

  it("descreve 1 mês atrás no singular", () => {
    expect(relativeTime(Date.now() - 1000 * 60 * 60 * 24 * 35)).toBe("1 mês atrás")
  })

  it("descreve meses no plural", () => {
    expect(relativeTime(Date.now() - 1000 * 60 * 60 * 24 * 65)).toBe("2 meses atrás")
    expect(relativeTime(Date.now() - 1000 * 60 * 60 * 24 * 95)).toBe("3 meses atrás")
  })
})

describe("formatMoney — moedas adicionais", () => {
  it("formata EUR (locale de-DE usa vírgula decimal)", () => {
    // EUR usa de-DE: "10,00 €" ou similar — só verifica que contém o valor
    const result = formatMoney(10, "EUR")
    expect(result).toContain("10")
    expect(result).toContain("€")
  })

  it("formata GBP (locale en-GB usa ponto decimal)", () => {
    const result = formatMoney(10, "GBP")
    expect(result).toContain("10")
    expect(result).toContain("£")
  })

  it("moeda desconhecida cai no locale pt-BR", () => {
    // Sem crash, retorna algo sensato
    expect(() => formatMoney(10, "XYZ")).not.toThrow()
  })
})

describe("formatDate — casos adicionais", () => {
  it("formata string ISO com hora (sem apêndice T00:00)", () => {
    expect(formatDate("2023-10-12T14:30:00")).toMatch(/12 de out\.? de 2023/)
  })

  it("retorna travessão para string de data claramente inválida", () => {
    expect(formatDate("0000-99-99")).toBe("—")
  })
})
