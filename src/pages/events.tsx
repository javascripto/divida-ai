import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Pencil, Copy, Trash2 } from "lucide-react"
import { PageHeader } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EventFormDialog } from "@/components/event-form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { useStore, newId } from "@/store/store"
import { formatMoney, formatDate, relativeTime } from "@/lib/format"
import { roundMoney } from "@/lib/settlement"
import type { AppEvent } from "@/lib/types"
import { toast } from "sonner"
import { deleteReceiptsByExpenses } from "@/lib/receipt-db"
import { getEventType } from "@/lib/event-types"

const statusLabel: Record<AppEvent["status"], string> = {
  open: "ABERTO",
  closed: "FECHADO",
  settled: "QUITADO",
}

function EventCard({ event }: { event: AppEvent }) {
  const navigate = useNavigate()
  const { dispatch } = useStore()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const total = roundMoney(event.expenses.reduce((s, e) => s + e.amount, 0))
  const eventType = getEventType(event.type)
  const EventIcon = eventType.icon

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex size-11 items-center justify-center rounded-xl bg-primary-fixed text-on-primary-fixed-variant"
            title={eventType.label}
            aria-label={`Tipo: ${eventType.label}`}
          >
            <EventIcon className="size-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold leading-tight">{event.name}</h3>
            <p className="text-xs text-on-surface-variant">Atualizado {relativeTime(event.updatedAt)}</p>
          </div>
        </div>
        <Badge variant={event.status}>{statusLabel[event.status]}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-outline-variant/40 pt-4 text-sm">
        <Stat label="Total gasto" value={formatMoney(total, event.currency)} highlight />
        <Stat label="Despesas" value={`${event.expenses.length} ${event.expenses.length === 1 ? "lançamento" : "lançamentos"}`} />
        <Stat label="Participantes" value={`${event.participants.length} ${event.participants.length === 1 ? "pessoa" : "pessoas"}`} />
        <Stat label="Data" value={formatDate(event.startDate)} />
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Button className="flex-1" variant={event.status === "open" ? "default" : "tonal"} onClick={() => navigate(`/event/${event.id}`)}>
          {event.status === "settled" ? "Ver resumo" : "Abrir"}
        </Button>
        <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEditing(true)}>
          <Pencil className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Duplicar"
          onClick={() => {
            dispatch({ type: "DUPLICATE_EVENT", id: event.id, newId: newId() })
            toast.success("Evento duplicado")
          }}
        >
          <Copy className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Excluir"
          className="text-error hover:bg-error-container"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <EventFormDialog open={editing} onOpenChange={setEditing} event={event} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Excluir "${event.name}"?`}
        description="Esta ação não pode ser desfeita. Todas as despesas e acertos do evento serão removidos."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          deleteReceiptsByExpenses(event.expenses.map((e) => e.id))
          dispatch({ type: "DELETE_EVENT", id: event.id })
          toast.success("Evento excluído")
        }}
      />
    </Card>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className={highlight ? "font-semibold text-primary" : "font-semibold text-on-surface"}>{value}</p>
    </div>
  )
}

export function EventsPage() {
  const { events } = useStore()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  return (
    <div>
      <PageHeader
        title="Seus eventos"
        subtitle="Acompanhe e gerencie despesas compartilhadas com facilidade."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Criar evento
          </Button>
        }
      />

      {events.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-on-surface-variant">Nenhum evento ainda.</p>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Criar seu primeiro evento
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}

      <EventFormDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(id) => navigate(`/event/${id}`)}
      />
    </div>
  )
}
