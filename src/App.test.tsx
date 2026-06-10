import { useEffect } from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, useNavigate } from "react-router-dom"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "./App"

const mounts = vi.hoisted(() => ({ expense: vi.fn(), dashboard: vi.fn() }))
vi.mock("@/components/layout", () => ({ Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div> }))
vi.mock("@/pages/events", () => ({ EventsPage: () => <div>Eventos page</div> }))
vi.mock("@/pages/expenses", () => ({ ExpensesPage: () => <div>Expenses page</div> }))
vi.mock("@/pages/participants", () => ({ ParticipantsPage: () => <div>Participants page</div> }))
vi.mock("@/pages/settings", () => ({ SettingsPage: () => <div>Settings page</div> }))
vi.mock("@/pages/settlements", () => ({ SettlementsPage: () => <div>Settlements page</div> }))
vi.mock("@/pages/add-expense", () => ({ AddExpensePage: () => {
  useEffect(() => { mounts.expense(); return () => mounts.expense("unmount") }, [])
  return <div>Add expense page</div>
} }))
vi.mock("@/pages/event-dashboard", () => ({ EventDashboardPage: () => {
  useEffect(() => { mounts.dashboard(); return () => mounts.dashboard("unmount") }, [])
  return <div>Dashboard page</div>
} }))

function Navigator() {
  const navigate = useNavigate()
  return <><button onClick={() => navigate("/event/two")}>Outro evento</button><button onClick={() => navigate("/event/one/expenses/x/edit")}>Editar</button></>
}
function renderApp(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Navigator /><App /></MemoryRouter>)
}

describe("App routes", () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ["/", "Eventos page"],
    ["/event/e1", "Dashboard page"],
    ["/event/e1/expenses", "Expenses page"],
    ["/event/e1/participants", "Participants page"],
    ["/event/e1/settlements", "Settlements page"],
    ["/settings", "Settings page"],
  ])("renderiza %s", (path, text) => {
    renderApp(path)
    expect(screen.getByText(text)).toBeVisible()
    expect(screen.getByTestId("layout")).toBeVisible()
  })

  it("renderiza criação e edição de despesa fora do layout", async () => {
    const user = userEvent.setup()
    renderApp("/event/one/expenses/new")
    expect(screen.getByText("Add expense page")).toBeVisible()
    expect(screen.queryByTestId("layout")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Editar" }))
    expect(mounts.expense).toHaveBeenCalledWith("unmount")
    expect(mounts.expense).toHaveBeenCalledTimes(3)
  })

  it("remonta páginas quando muda o eventId", async () => {
    renderApp("/event/one")
    await userEvent.click(screen.getByRole("button", { name: "Outro evento" }))
    expect(mounts.dashboard).toHaveBeenCalledWith("unmount")
    expect(mounts.dashboard).toHaveBeenCalledTimes(3)
  })

  it("redireciona rota desconhecida", () => {
    renderApp("/nao-existe")
    expect(screen.getByText("Eventos page")).toBeVisible()
  })
})
