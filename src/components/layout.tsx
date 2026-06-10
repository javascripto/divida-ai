import { NavLink, useLocation, useMatch, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ReceiptText,
  HandCoins,
  Settings as SettingsIcon,
  Plus,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useStore } from "@/store/store"
import { toast } from "sonner"

const navItems = [
  { to: "/", label: "Eventos", icon: CalendarDays, end: true },
]

const eventNav = (eventId: string) => [
  { to: `/event/${eventId}`, label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: `/event/${eventId}/participants`, label: "Participantes", icon: Users, end: false },
  { to: `/event/${eventId}/expenses`, label: "Despesas", icon: ReceiptText, end: false },
  { to: `/event/${eventId}/settlements`, label: "Acertos", icon: HandCoins, end: false },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { events } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  // O Layout fica no nível da rota "*", então o parâmetro :eventId não aparece
  // em useParams aqui — ele é casado pelo <Routes> interno. Extraímos o evento
  // ativo do próprio caminho para que a navegação lateral aponte sempre para o
  // evento que está sendo visualizado (e não para o primeiro da lista).
  const eventMatch = useMatch("/event/:eventId/*")
  const activeEventId = eventMatch?.params.eventId ?? events[0]?.id
  const items = [
    ...navItems,
    ...(activeEventId ? eventNav(activeEventId) : []),
    { to: "/settings", label: "Configurações", icon: SettingsIcon, end: true },
  ]

  const onAddExpense = () => {
    if (!activeEventId) return navigate("/")
    const activeEvent = events.find((e) => e.id === activeEventId)
    if (activeEvent && activeEvent.participants.length === 0) {
      toast.info("Adicione participantes ao evento antes de cadastrar despesas")
      return navigate(`/event/${activeEventId}/participants`)
    }
    navigate(`/event/${activeEventId}/expenses/new`)
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-outline-variant/60 bg-surface px-4 py-6 md:flex">
        <div className="px-2">
          <h1 className="text-xl font-bold text-primary">Conta Certa</h1>
          <p className="text-xs text-on-surface-variant">Assistente pessoal</p>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-fixed text-on-primary-fixed-variant dark:bg-surface-container-high dark:text-primary"
                    : "text-on-surface-variant hover:bg-surface-container",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <Button size="lg" className="w-full rounded-full" onClick={onAddExpense}>
          <Plus className="size-5" />
          Nova despesa
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar mobile */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-outline-variant/60 bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
          <NavLink to="/" className="text-lg font-bold text-primary">Conta Certa</NavLink>
          <Button size="sm" onClick={onAddExpense}>
            <Plus className="size-4" /> Despesa
          </Button>
        </header>

        <main className="flex-1 px-5 py-6 pb-24 md:px-10 md:py-8">{children}</main>

        {/* Bottom nav mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-outline-variant/60 bg-surface/95 px-2 py-2 backdrop-blur md:hidden">
          {(activeEventId
            ? [...eventNav(activeEventId), { to: "/settings", label: "Configurações", icon: SettingsIcon, end: true }]
            : [navItems[0], { to: "/settings", label: "Configurações", icon: SettingsIcon, end: true }]
          ).map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[10px] font-medium",
                  isActive ? "text-primary" : "text-on-surface-variant",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  back,
}: {
  title: React.ReactNode
  subtitle?: string
  badge?: React.ReactNode
  actions?: React.ReactNode
  back?: { to: string; label: string }
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {back && (
          <NavLink
            to={back.to}
            className="mb-1 flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary md:hidden"
          >
            <ChevronLeft className="size-3.5" />
            {back.label}
          </NavLink>
        )}
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-on-surface md:text-3xl">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
