import { useMemo, useState } from "react"
import { useNavigate, useParams, Navigate } from "react-router-dom"
import { ArrowLeft, Save, Check, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useStore, newId } from "@/store/store"
import { categoryMeta, categoryOrder } from "@/lib/categories"
import { formatMoney } from "@/lib/format"
import { roundMoney } from "@/lib/settlement"
import type { Expense, ExpenseCategory } from "@/lib/types"
import { toast } from "sonner"

const today = () => new Date().toISOString().slice(0, 10)

export function AddExpensePage() {
  const { eventId, expenseId } = useParams()
  const navigate = useNavigate()
  const { getEvent, dispatch } = useStore()
  const event = getEvent(eventId!)
  const existing = event?.expenses.find((e) => e.id === expenseId)
  const isEdit = !!existing

  const [description, setDescription] = useState(existing?.description ?? "")
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "")
  const [paidBy, setPaidBy] = useState(existing?.paidBy ?? event?.participants[0]?.id ?? "")
  const [category, setCategory] = useState<ExpenseCategory>(existing?.category ?? "food")
  const [date, setDate] = useState(existing?.date ?? today())
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [splitBetween, setSplitBetween] = useState<string[]>(
    existing?.splitBetween ?? event?.participants.map((p) => p.id) ?? [],
  )

  const numericAmount = useMemo(() => {
    const v = parseFloat(amount.replace(",", "."))
    return Number.isFinite(v) ? v : 0
  }, [amount])

  const perPerson = splitBetween.length > 0 ? roundMoney(numericAmount / splitBetween.length) : 0

  if (!event) return <Navigate to="/" replace />

  const toggleSplit = (id: string) =>
    setSplitBetween((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))

  const save = () => {
    if (!description.trim()) return toast.error("Informe uma descrição")
    if (numericAmount <= 0) return toast.error("Informe um valor válido")
    if (!paidBy) return toast.error("Selecione quem pagou")
    if (splitBetween.length === 0) return toast.error("Selecione ao menos um participante na divisão")

    const expense: Expense = {
      id: existing?.id ?? newId(),
      description: description.trim(),
      amount: roundMoney(numericAmount),
      paidBy,
      splitBetween,
      category,
      date,
      notes: notes.trim() || undefined,
    }
    dispatch(
      isEdit
        ? { type: "UPDATE_EXPENSE", eventId: event.id, expense }
        : { type: "ADD_EXPENSE", eventId: event.id, expense },
    )
    toast.success(isEdit ? "Despesa atualizada" : "Despesa adicionada")
    navigate(`/event/${event.id}/expenses`)
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between border-b border-outline-variant/50 px-5 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" aria-label="Voltar" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-bold">{isEdit ? "Editar despesa" : "Adicionar despesa"}</h1>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{event.name}</p>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-8 md:grid-cols-[1fr_320px] md:px-10">
        <div className="space-y-6">
          {/* Detalhes */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-primary">Detalhes da despesa</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="desc">Descrição</Label>
                <Input id="desc" placeholder="ex.: Jantar no píer" value={description} onChange={(e) => setDescription(e.target.value)} autoFocus />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input id="amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Pago por</Label>
                <Select value={paidBy} onValueChange={setPaidBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {event.participants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <div className="flex flex-wrap gap-2">
                  {categoryOrder.map((cat) => {
                    const meta = categoryMeta[cat]
                    const Icon = meta.icon
                    const active = category === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                          active ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant",
                        )}
                      >
                        <Icon className="size-3.5" />
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input id="notes" placeholder="Adicione um detalhe…" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </Card>

          {/* Divisão */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-primary">Dividir entre</h2>
                <p className="text-sm text-on-surface-variant">Selecione quem participa desta despesa</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Prévia</p>
                <p className="font-semibold text-primary">{formatMoney(perPerson, event.currency)} / cada</p>
              </div>
            </div>
            {event.participants.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Nenhum participante. Adicione participantes ao evento primeiro.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {event.participants.map((p) => {
                  const active = splitBetween.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleSplit(p.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors",
                        active ? "border-primary bg-primary-fixed/40" : "border-outline-variant bg-surface-container-low",
                      )}
                    >
                      <Avatar name={p.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <p className="text-xs text-on-surface-variant">{active ? "Participando" : "Fora"}</p>
                      </div>
                      {active && <Check className="size-4 text-primary" />}
                    </button>
                  )
                })}
              </div>
            )}
            <p className="mt-4 text-xs text-on-surface-variant">
              A divisão é feita igualmente entre os selecionados (lógica de rateio do app).
            </p>
          </Card>
        </div>

        {/* Resumo lateral */}
        <div className="space-y-4">
          <Card className="bg-primary p-6 text-on-primary">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">Resumo</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-white/20 pb-3">
                <dt className="opacity-80">Pago por</dt>
                <dd className="font-semibold">{event.participants.find((p) => p.id === paidBy)?.name ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-white/20 pb-3">
                <dt className="opacity-80">Dividido entre</dt>
                <dd className="font-semibold">{splitBetween.length} {splitBetween.length === 1 ? "pessoa" : "pessoas"}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-white/20 pb-3">
                <dt className="opacity-80">Categoria</dt>
                <dd className="font-semibold">{categoryMeta[category].label}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs opacity-80">Parte individual</p>
            <p className="text-2xl font-bold">{formatMoney(perPerson, event.currency)}</p>
          </Card>

          <Button size="lg" className="w-full" onClick={save}>
            <Save className="size-4" /> Salvar despesa
          </Button>
          <Button size="lg" variant="tonal" className="w-full" onClick={() => navigate(-1)}>
            Cancelar
          </Button>

          <div className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-outline-variant p-6 text-center text-on-surface-variant">
            <ScanLine className="size-6" />
            <p className="text-sm font-semibold">Escanear recibo</p>
            <p className="text-xs">Em breve</p>
          </div>
        </div>
      </div>
    </div>
  )
}
