import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AppEvent } from "@/lib/types"
import { Layout, PageHeader } from "./layout"

const mocks = vi.hoisted(() => ({ events: [] as AppEvent[], navigate: vi.fn(), info: vi.fn() }))
vi.mock("@/store/store", () => ({ useStore: () => ({ events: mocks.events }) }))
vi.mock("react-router-dom", async () => ({ ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")), useNavigate: () => mocks.navigate }))
vi.mock("sonner", () => ({ toast: { info: mocks.info } }))

const event = (participants: AppEvent["participants"]): AppEvent => ({
  id: "e1", name: "Viagem", currency: "BRL", status: "open", createdAt: 0, updatedAt: 0,
  participants, expenses: [], settledPairs: [],
})
function renderLayout(path = "/") {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={<Layout><div>Conteúdo</div></Layout>} /></Routes></MemoryRouter>)
}

describe("Layout", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.events = [] })

  it("mostra navegação básica sem evento", () => {
    renderLayout()
    expect(screen.getAllByRole("link", { name: "Eventos" }).length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: "Nova despesa" })).not.toBeInTheDocument()
  })

  it("usa o evento da URL e abre nova despesa", async () => {
    mocks.events = [event([{ id: "a", name: "Alice" }])]
    renderLayout("/event/e1/expenses")
    expect(screen.getAllByRole("link", { name: "Dashboard" })[0]).toHaveAttribute("href", "/event/e1")
    await userEvent.click(screen.getByRole("button", { name: "Nova despesa" }))
    expect(mocks.navigate).toHaveBeenCalledWith("/event/e1/expenses/new")
  })

  it("redireciona para participantes quando o evento está vazio", async () => {
    mocks.events = [event([])]
    renderLayout("/event/e1")
    await userEvent.click(screen.getByRole("button", { name: "Nova despesa" }))
    expect(mocks.info).toHaveBeenCalled()
    expect(mocks.navigate).toHaveBeenCalledWith("/event/e1/participants")
  })
})

it("PageHeader renderiza conteúdo opcional", () => {
  render(<MemoryRouter><PageHeader title="Título" subtitle="Sub" badge={<span>Badge</span>} actions={<button>Ação</button>} back={{ to: "/", label: "Voltar" }} /></MemoryRouter>)
  expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute("href", "/")
  expect(screen.getByText("Sub")).toBeVisible()
  expect(screen.getByText("Badge")).toBeVisible()
})
