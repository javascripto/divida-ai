import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "sonner"
import "./index.css"
import App from "./App"
import { StoreProvider } from "./store/store"
import { ThemeProvider } from "./components/theme-provider"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <ThemeProvider>
        <BrowserRouter>
          <App />
          <Toaster position="top-center" richColors />
        </BrowserRouter>
      </ThemeProvider>
    </StoreProvider>
  </StrictMode>,
)
