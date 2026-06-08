const currencyLocales: Record<string, string> = {
  BRL: "pt-BR",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
}

export function formatMoney(value: number, currency = "BRL"): string {
  const locale = currencyLocales[currency] ?? "pt-BR"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value)
}

export function formatDate(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""))
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(d)
}

export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const min = Math.floor(diff / 60000)
  if (min < 1) return "agora"
  if (min < 60) return `${min} min atrás`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d atrás`
  const months = Math.floor(days / 30)
  return `${months} ${months === 1 ? "mês" : "meses"} atrás`
}

export const currencyOptions = [
  { value: "BRL", label: "BRL — Real Brasileiro" },
  { value: "USD", label: "USD — Dólar Americano" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — Libra" },
]
