import { useState } from "react"
import { useParams, Navigate } from "react-router-dom"
import { ArrowRight, ChevronDown, BarChart3, RotateCcw, CheckCircle2, Copy } from "lucide-react"
import { PageHeader } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { useEventSummary, type EventSummary } from "@/hooks/use-event-summary"
import { formatMoney } from "@/lib/format"
import type { AppEvent } from "@/lib/types"
import { toast } from "sonner"

// Monta um resumo em texto (estilo da saída do rateio.ts) para compartilhar.
function buildSettlementText(event: AppEvent, summary: EventSummary): string {
  const { settlements, balances, net, nameOf, totalSpent, expenses } = summary
  const money = (v: number) => formatMoney(v, event.currency)
  const lines: string[] = []

  lines.push(`💰 Divida aí — ${event.name}`)
  lines.push(`Total gasto: ${money(totalSpent)}`)
  lines.push("")

  lines.push("📋 Despesas")
  for (const e of expenses) {
    const split = e.splitBetween.map(nameOf).join(", ")
    lines.push(`• ${money(e.amount)} — ${e.description} (pago por ${nameOf(e.paidBy)}; dividido entre ${split})`)
  }
  lines.push("")

  lines.push("🤝 Pagamentos para acertar")
  if (settlements.length === 0) {
    lines.push("• Nada a acertar.")
  } else {
    for (const s of settlements) {
      lines.push(`• ${nameOf(s.from)} → ${nameOf(s.to)}: ${money(s.amount)}${s.paid ? " ✅ (pago)" : ""}`)
    }
  }
  lines.push("")

  lines.push("📊 Saldo de cada participante")
  for (const b of balances) {
    const value = net.get(b.participantId) ?? 0
    const sign = value > 0 ? "+" : ""
    lines.push(`• ${nameOf(b.participantId)}: ${sign}${money(value)}`)
  }

  return lines.join("\n")
}

export function SettlementsPage() {
  const { eventId } = useParams()
  const { getEvent, dispatch } = useStore()
  const event = getEvent(eventId!)
  const summary = useEventSummary(event)
  const [showDetails, setShowDetails] = useState(false)

  if (!event) return <Navigate to="/" replace />
  if (!summary) return null

  const { settlements, balances, net, nameOf, isFullySettled } = summary

  const handleCopy = async () => {
    const text = buildSettlementText(event, summary)
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Detalhes copiados para a área de transferência")
    } catch {
      toast.error("Não foi possível copiar")
    }
  }

  return (
    <div>
      <PageHeader
        title="Pagamentos para acertar"
        subtitle="Revise e confirme as dívidas entre os membros do grupo."
        actions={
          settlements.length > 0 && (
            <Button variant="tonal" onClick={handleCopy}>
              <Copy className="size-4" /> Copiar detalhes
            </Button>
          )
        }
      />

      {isFullySettled && (
        <Card className="mb-6 flex items-center gap-3 bg-secondary-container p-5 text-on-secondary-container">
          <CheckCircle2 className="size-7 shrink-0" />
          <p className="font-semibold">Tudo certo! Todos os pagamentos foram quitados.</p>
        </Card>
      )}

      <div className="space-y-4">
        {settlements.length === 0 && (
          <Card className="p-8 text-center text-on-surface-variant">
            Não há nada a acertar. Adicione despesas para gerar os pagamentos.
          </Card>
        )}
        {settlements.map((s) => (
          <Card key={s.id} className={cn("p-5 transition-opacity", s.paid && "opacity-60")}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Avatar name={nameOf(s.from)} />
                  <div className="text-sm">
                    <p className="font-semibold">{nameOf(s.from)}</p>
                    <p className="text-xs text-on-surface-variant">paga para {nameOf(s.to)}</p>
                  </div>
                </div>
                <ArrowRight className="size-5 text-on-surface-variant" />
                <div className="flex items-center gap-2">
                  <Avatar name={nameOf(s.to)} />
                  <div className="text-sm">
                    <p className="font-semibold">{nameOf(s.to)}</p>
                    <p className="text-xs text-on-surface-variant">Recebe</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary">{formatMoney(s.amount, event.currency)}</p>
                <Badge variant={s.paid ? "creditor" : "neutral"} className="mt-1">
                  {s.paid ? "Pago" : "Pendente"}
                </Badge>
              </div>
              <Button
                variant={s.paid ? "tonal" : "default"}
                onClick={() => {
                  dispatch({ type: "TOGGLE_SETTLED_PAIR", eventId: event.id, pairId: s.id })
                  toast.success(s.paid ? "Marcado como pendente" : "Pagamento confirmado")
                }}
              >
                {s.paid ? (
                  <>
                    <RotateCcw className="size-4" /> Reverter
                  </>
                ) : (
                  "Marcar como pago"
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {settlements.length > 0 && (
        <Card className="mt-4 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex w-full items-center justify-between gap-2 p-5 text-left"
          >
            <span className="flex items-center gap-2 font-semibold text-primary">
              <BarChart3 className="size-5" /> Ver detalhes do cálculo
            </span>
            <ChevronDown className={cn("size-5 text-on-surface-variant transition-transform", showDetails && "rotate-180")} />
          </button>
          {showDetails && (
            <div className="border-t border-outline-variant/40 px-5 py-4">
              <p className="mb-3 text-sm text-on-surface-variant">
                Saldo líquido de cada participante (positivo = a receber, negativo = a pagar). O algoritmo
                minimiza o número de transferências repassando dívidas.
              </p>
              <ul className="space-y-2 text-sm">
                {balances.map((b) => {
                  const value = net.get(b.participantId) ?? 0
                  return (
                    <li key={b.participantId} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Avatar name={nameOf(b.participantId)} size="sm" /> {nameOf(b.participantId)}
                      </span>
                      <span className={value > 0 ? "font-semibold text-secondary" : value < 0 ? "font-semibold text-error" : "text-on-surface-variant"}>
                        {value > 0 ? "+" : ""}
                        {formatMoney(value, event.currency)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
