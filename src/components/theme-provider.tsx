import { createContext, useContext, useEffect } from "react"
import { useStore } from "@/store/store"

type Theme = "light" | "dark" | "system"

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, dispatch } = useStore()
  const theme = settings.theme

  useEffect(() => {
    const root = document.documentElement
    const apply = (t: "light" | "dark") => {
      root.classList.remove("light", "dark")
      root.classList.add(t)
    }
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      apply(mq.matches ? "dark" : "light")
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light")
      mq.addEventListener("change", handler)
      return () => mq.removeEventListener("change", handler)
    }
    apply(theme)
  }, [theme])

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme: (t) => dispatch({ type: "UPDATE_SETTINGS", patch: { theme: t } }) }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme deve ser usado dentro de <ThemeProvider>")
  return ctx
}
