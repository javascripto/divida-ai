import { useNavigate, useParams, Navigate } from "react-router-dom"
import { Plus, ArrowRight, CheckCircle2, Scale } from "lucide-react"
import { PageHeader } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useStore } from "@/store/store"
import { useEventSummary } from "@/hooks/use-event-summary"
import { formatMoney } from "@/lib/format"
import { toast } from "sonner"

const statusBadge = { open: "Aberto", closed: "Fechado", settled: "Quitado" } as const

export function EventDashboardPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { getEvent, dispatch } = useStore()
  const event = getEvent(eventId!)
  const summary = useEventSummary(event)

  if (!event) return <Navigate to="/" replace />
  if (!summary) return null

  const { totalSpent, settlements, pendingSettlements, net, balances, nameOf, isFullySettled } = summary
  const maxAbsBalance = Math.max(1, ...balances.map((b) => Math.abs(net.get(b.participantId) ?? 0)))

  return (
    <div>
      <PageHeader
        title={event.name}
        subtitle="Gerencie as despesas da viagem e os acertos do grupo."
        badge={<Badge variant={event.status}>{statusBadge[event.status]}</Badge>}
        actions={
          <>
            <Button onClick={() => navigate(`/event/${event.id}/expenses/new`)}>
              <Plus className="size-4" /> Adicionar despesa
            </Button>
            <Button variant="tonal" size="icon" aria-label="Participantes" onClick={() => navigate(`/event/${event.id}/participants`)}>
              <Plus className="size-4" />
            </Button>
          </>
        }
      />

      {isFullySettled && (
        <Card className="mb-6 flex items-center gap-4 bg-primary p-5 text-on-primary">
          <CheckCircle2 className="size-8 shrink-0" />
          <div>
            <p className="text-lg font-semibold">Tudo certo! Este evento foi quitado.</p>
            <p className="text-sm opacity-90">Todos os acertos foram marcados como pagos.</p>
          </div>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Total gasto</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatMoney(totalSpent, event.currency)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Participantes</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold">{event.participants.length}</span>
            <div className="flex -space-x-1.5">
              {event.participants.slice(0, 4).map((p) => (
                <Avatar key={p.id} name={p.name} size="sm" className="ring-2 ring-surface-container-lowest" />
              ))}
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Despesas</p>
          <p className="mt-1 text-2xl font-bold">{event.expenses.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Acertos</p>
          <p className="mt-1 text-2xl font-bold">{settlements.length}</p>
        </Card>
      </div>

      {/* Who pays whom */}
      <section className="mt-8">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <ArrowRight className="size-5 text-primary" /> Quem paga quem
        </h3>
        {pendingSettlements.length === 0 ? (
          <Card className="p-6 text-center text-on-surface-variant">
            {settlements.length === 0
              ? "Adicione despesas para calcular os acertos."
              : "Nenhum pagamento pendente. Tudo acertado! 🎉"}
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingSettlements.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={nameOf(s.from)} size="sm" />
                    <ArrowRight className="size-4 text-on-surface-variant" />
                    <Avatar name={nameOf(s.to)} size="sm" />
                  </div>
                  <Badge variant="neutral">Pendente</Badge>
                </div>
                <p className="mt-3 text-sm text-on-surface-variant">
                  {nameOf(s.from)} paga {nameOf(s.to)}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xl font-bold text-error">{formatMoney(s.amount, event.currency)}</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      dispatch({ type: "TOGGLE_SETTLED_PAIR", eventId: event.id, pairId: s.id })
                      toast.success("Pagamento marcado como pago")
                    }}
                  >
                    Marcar como pago
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Participant balances */}
      <section className="mt-8">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Scale className="size-5 text-primary" /> Saldo dos participantes
        </h3>
        <Card className="divide-y divide-outline-variant/40">
          {balances.length === 0 && <p className="p-6 text-on-surface-variant">Sem participantes.</p>}
          {balances.map((b) => {
            const value = net.get(b.participantId) ?? 0
            const isCreditor = value > 0.001
            const isDebtor = value < -0.001
            return (
              <div key={b.participantId} className="flex items-center gap-4 p-4">
                <Avatar name={nameOf(b.participantId)} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{nameOf(b.participantId)}</p>
                  <p className={isCreditor ? "text-xs text-secondary" : isDebtor ? "text-xs text-error" : "text-xs text-on-surface-variant"}>
                    {isCreditor ? "Credor" : isDebtor ? "Devedor" : "Quitado"}
                  </p>
                </div>
                <div className="w-40 text-right">
                  <p className={isCreditor ? "font-semibold text-secondary" : isDebtor ? "font-semibold text-error" : "font-semibold text-on-surface-variant"}>
                    {isCreditor ? "+ " : isDebtor ? "- " : ""}
                    {formatMoney(Math.abs(value), event.currency)}
                  </p>
                  <Progress
                    className="mt-1"
                    value={(Math.abs(value) / maxAbsBalance) * 100}
                    indicatorClassName={isCreditor ? "bg-secondary" : "bg-error"}
                  />
                </div>
              </div>
            )
          })}
        </Card>
      </section>
    </div>
  )
}
