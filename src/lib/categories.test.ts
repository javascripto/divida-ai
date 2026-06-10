import { describe, expect, it } from "vitest"
import { categoryMeta, categoryOrder } from "./categories"
import type { ExpenseCategory } from "./types"

const ALL_CATEGORIES: ExpenseCategory[] = ["food", "transport", "stay", "other"]

describe("categoryMeta", () => {
  it("tem uma entrada para cada categoria do tipo ExpenseCategory", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(categoryMeta).toHaveProperty(cat)
    }
  })

  it("cada entrada tem label, icon e tint não-vazios", () => {
    for (const cat of ALL_CATEGORIES) {
      const meta = categoryMeta[cat]
      expect(meta.label.trim().length).toBeGreaterThan(0)
      // Lucide icons são forwardRef → typeof === "object"; aceita também "function"
      expect(["function", "object"]).toContain(typeof meta.icon)
      expect(meta.icon).not.toBeNull()
      expect(meta.tint.trim().length).toBeGreaterThan(0)
    }
  })

  it("labels são únicos entre categorias", () => {
    const labels = ALL_CATEGORIES.map((c) => categoryMeta[c].label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it("tints são strings de classes Tailwind (contêm 'bg-')", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(categoryMeta[cat].tint).toContain("bg-")
    }
  })
})

describe("categoryOrder", () => {
  it("contém todas as categorias do tipo ExpenseCategory", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(categoryOrder).toContain(cat)
    }
  })

  it("não tem duplicatas", () => {
    expect(new Set(categoryOrder).size).toBe(categoryOrder.length)
  })

  it("tem o mesmo tamanho que o conjunto completo de categorias", () => {
    expect(categoryOrder).toHaveLength(ALL_CATEGORIES.length)
  })
})
