import { Beef, MapPinned, PartyPopper, Plane, Shapes } from "lucide-react"
import type { ComponentType } from "react"
import type { EventType } from "@/lib/types"

export type EventTypeOption = {
  value: EventType
  label: string
  icon: ComponentType<{ className?: string }>
}

export const eventTypeOptions: EventTypeOption[] = [
  { value: "travel", label: "Viagem", icon: Plane },
  { value: "barbecue", label: "Churrasco", icon: Beef },
  { value: "party", label: "Festa", icon: PartyPopper },
  { value: "outing", label: "Passeio", icon: MapPinned },
  { value: "other", label: "Outros", icon: Shapes },
]

export function getEventType(type?: EventType): EventTypeOption {
  return eventTypeOptions.find((option) => option.value === type) ?? eventTypeOptions[0]
}
