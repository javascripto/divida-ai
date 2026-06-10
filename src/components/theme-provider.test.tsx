import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider, useTheme } from "./theme-provider"

const mocks = vi.hoisted(() => ({ theme: "light" as "light" | "dark" | "system", dispatch: vi.fn() }))
vi.mock("@/store/store", () => ({ useStore: () => ({ settings: { theme: mocks.theme }, dispatch: mocks.dispatch }) }))

function Consumer() {
  const { theme, setTheme } = useTheme()
  return <button onClick={() => setTheme("dark")}>{theme}</button>
}

describe("ThemeProvider", () => {
  beforeEach(() => { vi.clearAllMocks(); document.documentElement.className = ""; mocks.theme = "light" })

  it("aplica tema explícito e permite alterá-lo", async () => {
    render(<ThemeProvider><Consumer /></ThemeProvider>)
    expect(document.documentElement).toHaveClass("light")
    await userEvent.click(screen.getByRole("button", { name: "light" }))
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "UPDATE_SETTINGS", patch: { theme: "dark" } })
  })

  it("acompanha o tema do sistema e remove o listener ao desmontar", () => {
    mocks.theme = "system"
    let handler: ((event: { matches: boolean }) => void) | undefined
    const addEventListener = vi.fn((_type, cb) => { handler = cb })
    const removeEventListener = vi.fn()
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener, removeEventListener })))
    const { unmount } = render(<ThemeProvider><Consumer /></ThemeProvider>)
    expect(document.documentElement).toHaveClass("dark")
    handler?.({ matches: false })
    expect(document.documentElement).toHaveClass("light")
    unmount()
    expect(removeEventListener).toHaveBeenCalledWith("change", handler)
  })

  it("exige uso dentro do provider", () => {
    expect(() => render(<Consumer />)).toThrow("useTheme deve ser usado dentro de <ThemeProvider>")
  })
})
