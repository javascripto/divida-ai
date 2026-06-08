import { Utensils, Car, BedDouble, Tag } from "lucide-react"
import type { ExpenseCategory } from "./types"

export const categoryMeta: Record<
  ExpenseCategory,
  { label: string; icon: typeof Tag; tint: string }
> = {
  food: { label: "Alimentação", icon: Utensils, tint: "bg-secondary-container text-on-secondary-container" },
  transport: { label: "Transporte", icon: Car, tint: "bg-primary-fixed text-on-primary-fixed-variant" },
  stay: { label: "Hospedagem", icon: BedDouble, tint: "bg-tertiary-container text-on-tertiary" },
  other: { label: "Outros", icon: Tag, tint: "bg-surface-container-high text-on-surface-variant" },
}

export const categoryOrder: ExpenseCategory[] = ["food", "transport", "stay", "other"]
