import { useMemo, useState } from "react"
import { useNavigate, useParams, Navigate } from "react-router-dom"
import { Plus, Search, Pencil, Trash2, CalendarDays, Users as UsersIcon } from "lucide-react"
import { PageHeader } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore } from "@/store/store"
import { useEventSummary } from "@/hooks/use-event-summary"
import { categoryMeta } from "@/lib/categories"
import { formatMoney, formatDate } from "@/lib/format"
import { toast } from "sonner"

export function ExpensesPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { getEvent, dispatch } = useStore()
  const event = getEvent(eventId!)
  const summary = useEventSummary(event)
  const [query, setQuery] = useState("")
  const [payer, setPayer] = useState("all")

  const filtered = useMemo(() => {
    if (!event) return []
    return event.expenses.filter((e) => {
      const matchesQuery = e.description.toLowerCase().includes(query.toLowerCase())
      const matchesPayer = payer === "all" || e.paidBy === payer
      return matchesQuery && matchesPayer
    })
  }, [event, query, payer])

  if (!event) return <Navigate to="/" replace />
  if (!summary) return null

  const { totalSpent, settledPct, pendingTotal, nameOf } = summary

  return (
    <div>
      <PageHeader
        title="Lista de despesas"
        subtitle="Gerencie e acompanhe todos os custos compartilhados do grupo."
        actions={
          event.participants.length === 0 ? (
            <Button onClick={() => navigate(`/event/${event.id}/participants`)}>
              <UsersIcon className="size-4" /> Adicionar participantes
            </Button>
          ) : (
            <Button onClick={() => navigate(`/event/${event.id}/expenses/new`)}>
              <Plus className="size-4" /> Adicionar despesa
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            className="pl-9"
            placeholder="Buscar despesas…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={payer} onValueChange={setPayer}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os participantes</SelectItem>
            {event.participants.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-on-surface-variant">
            Nenhuma despesa encontrada.
          </Card>
        )}
        {filtered.map((expense) => {
          const meta = categoryMeta[expense.category]
          const Icon = meta.icon
          return (
            <Card key={expense.id} className="group flex items-center gap-3 p-4">
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${meta.tint}`}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h4 className="min-w-0 truncate font-semibold">{expense.description}</h4>
                  <Badge variant="category" className="shrink-0">{meta.label}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                  <span>Pago por {nameOf(expense.paidBy)}</span>
                  <span className="flex items-center gap-1">
                    <UsersIcon className="size-3" /> Dividido entre {expense.splitBetween.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" /> {formatDate(expense.date)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="whitespace-nowrap font-bold text-error">
                  {formatMoney(expense.amount, event.currency)}
                </span>
                <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label="Editar despesa"
                    onClick={() => navigate(`/event/${event.id}/expenses/${expense.id}/edit`)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir despesa"
                    className="size-8 text-error hover:bg-error-container"
                    onClick={() => {
                      dispatch({ type: "DELETE_EXPENSE", eventId: event.id, expenseId: expense.id })
                      toast.success("Despesa excluída")
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="bg-primary p-5 text-on-primary">
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">Total de despesas</p>
          <p className="mt-1 text-3xl font-bold">{formatMoney(totalSpent, event.currency)}</p>
          <Badge className="mt-3 bg-white/20 text-on-primary">{event.expenses.length} lançamentos</Badge>
        </Card>
        <Card className="flex flex-col justify-center p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Status do acerto</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm">
              {pendingTotal > 0 ? (
                <>Pendente de aproximadamente <strong>{formatMoney(pendingTotal, event.currency)}</strong></>
              ) : (
                "Tudo acertado!"
              )}
            </p>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/event/${event.id}/settlements`)}>
              Acertar
            </Button>
          </div>
          <Progress className="mt-3" value={settledPct} indicatorClassName="bg-primary" />
        </Card>
      </div>
    </div>
  )
}
