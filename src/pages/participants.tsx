import { useState } from "react"
import { useParams, Navigate } from "react-router-dom"
import { UserPlus, Plus, Trash2 } from "lucide-react"
import { PageHeader } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { useStore, newId } from "@/store/store"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { useEventSummary } from "@/hooks/use-event-summary"
import { formatMoney } from "@/lib/format"
import { toast } from "sonner"

export function ParticipantsPage() {
  const { eventId } = useParams()
  const { getEvent, dispatch } = useStore()
  const event = getEvent(eventId!)
  const summary = useEventSummary(event)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  if (!event) return <Navigate to="/" replace />
  if (!summary) return null

  const { balances, net, settledPct, pendingTotal } = summary

  const addParticipant = () => {
    if (!name.trim()) return toast.error("Informe o nome")
    dispatch({ type: "ADD_PARTICIPANT", eventId: event.id, participant: { id: newId(), name: name.trim() } })
    toast.success("Participante adicionado")
    setName("")
    setAdding(false)
  }

  return (
    <div>
      <PageHeader
        title="Participantes do evento"
        subtitle={`Gerencie quem divide os custos de "${event.name}".`}
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus className="size-4" /> Adicionar participante
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Participantes ativos</p>
          <p className="mt-1 text-2xl font-bold text-primary">{String(event.participants.length).padStart(2, "0")}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Status do acerto</p>
          <p className="mt-1 text-2xl font-bold text-secondary">{settledPct}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Saldo pendente</p>
          <p className="mt-1 text-2xl font-bold text-error">{formatMoney(pendingTotal, event.currency)}</p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {balances.map((b) => {
          const participant = event.participants.find((p) => p.id === b.participantId)!
          const value = net.get(b.participantId) ?? 0
          const isCreditor = value > 0.001
          const isDebtor = value < -0.001
          return (
            <Card key={b.participantId} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={participant.name} />
                  <div>
                    <p className="font-semibold">{participant.name}</p>
                    <Badge variant={isCreditor ? "creditor" : isDebtor ? "debtor" : "settled"}>
                      {isCreditor ? "CREDOR" : isDebtor ? "DEVEDOR" : "QUITADO"}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remover participante"
                  className="text-error hover:bg-error-container"
                  onClick={() => setConfirmRemove(b.participantId)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">Total pago</dt>
                  <dd className="font-semibold">{formatMoney(b.paid, event.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">Total consumido</dt>
                  <dd className="font-semibold">{formatMoney(b.consumed, event.currency)}</dd>
                </div>
                <div className="flex justify-between border-t border-outline-variant/40 pt-2">
                  <dt className="font-semibold">Saldo final</dt>
                  <dd className={isCreditor ? "font-bold text-secondary" : isDebtor ? "font-bold text-error" : "font-bold text-on-surface-variant"}>
                    {isCreditor ? "+" : isDebtor ? "-" : ""}
                    {formatMoney(Math.abs(value), event.currency)}
                  </dd>
                </div>
              </dl>
            </Card>
          )
        })}

        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="size-6" />
          <span className="font-semibold">Novo participante</span>
        </button>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo participante</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5 px-6">
            <Label htmlFor="p-name">Nome</Label>
            <Input
              id="p-name"
              placeholder="ex.: Maria"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addParticipant()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button onClick={addParticipant}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmRemove && (() => {
        const p = event.participants.find((x) => x.id === confirmRemove)
        return (
          <ConfirmDialog
            open={!!confirmRemove}
            onOpenChange={(v) => !v && setConfirmRemove(null)}
            title={`Remover ${p?.name ?? "participante"}?`}
            description="As despesas pagas por ele(a) também serão removidas. Esta ação não pode ser desfeita."
            confirmLabel="Remover"
            destructive
            onConfirm={() => {
              dispatch({ type: "DELETE_PARTICIPANT", eventId: event.id, participantId: confirmRemove })
              toast.success("Participante removido")
              setConfirmRemove(null)
            }}
          />
        )
      })()}
    </div>
  )
}
