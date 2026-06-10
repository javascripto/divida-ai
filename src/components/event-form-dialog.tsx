import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { currencyOptions } from "@/lib/format"
import { eventTypeOptions } from "@/lib/event-types"
import { newId, useStore } from "@/store/store"
import type { AppEvent, EventStatus, EventType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  event?: AppEvent
  onCreated?: (id: string) => void
}) {
  const { dispatch, settings } = useStore()
  const isEdit = !!event
  const [name, setName] = useState("")
  const [type, setType] = useState<EventType>("travel")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [currency, setCurrency] = useState(settings.defaultCurrency)
  const [status, setStatus] = useState<EventStatus>("open")

  useEffect(() => {
    if (open) {
      setName(event?.name ?? "")
      setType(event?.type ?? "travel")
      setDescription(event?.description ?? "")
      setStartDate(event?.startDate ?? "")
      setEndDate(event?.endDate ?? "")
      setCurrency(event?.currency ?? settings.defaultCurrency)
      setStatus(event?.status ?? "open")
    }
  }, [open, event, settings.defaultCurrency])

  const submit = () => {
    if (!name.trim()) {
      toast.error("Dê um nome ao evento")
      return
    }
    if (isEdit) {
      dispatch({
        type: "UPDATE_EVENT",
        id: event!.id,
        patch: { name: name.trim(), type, description, startDate, endDate, currency, status },
      })
      toast.success("Evento atualizado")
    } else {
      const id = newId()
      const newEvent: AppEvent = {
        id,
        name: name.trim(),
        type,
        description,
        startDate,
        endDate,
        currency,
        status,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        participants: [],
        expenses: [],
        settledPairs: [],
      }
      dispatch({ type: "ADD_EVENT", payload: newEvent })
      toast.success("Evento criado")
      onCreated?.(id)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar evento" : "Novo evento"}</DialogTitle>
          <DialogDescription>
            Organize as despesas compartilhadas de qualquer ocasião.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6">
          <div className="grid gap-1.5">
            <Label htmlFor="ev-name">Nome do evento</Label>
            <Input
              id="ev-name"
              placeholder="ex.: Viagem de verão 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Tipo de evento</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {eventTypeOptions.map((option) => {
                const Icon = option.icon
                const selected = type === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setType(option.value)}
                    className={cn(
                      "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary-fixed text-on-primary-fixed-variant ring-1 ring-primary"
                        : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high",
                    )}
                  >
                    <Icon className="size-5" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <div className="grid gap-1.5">
            <Label htmlFor="ev-desc">Descrição (opcional)</Label>
            <Textarea
              id="ev-desc"
              placeholder="Adicione detalhes sobre o evento…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Data de início</Label>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="Selecione a data de início" />
            </div>
            <div className="grid gap-1.5">
              <Label>Data de fim (opcional)</Label>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="Selecione a data de fim" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Moeda</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Tabs value={status} onValueChange={(v) => setStatus(v as EventStatus)}>
              <TabsList className="w-full">
                <TabsTrigger className="flex-1" value="open">Aberto</TabsTrigger>
                <TabsTrigger className="flex-1" value="closed">Fechado</TabsTrigger>
                <TabsTrigger className="flex-1" value="settled">Quitado</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
