import { cn } from "@/lib/utils"

// Cores determinísticas a partir do nome — consistentes entre telas.
const palette = [
  "bg-primary text-on-primary",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary",
  "bg-primary-fixed text-on-primary-fixed-variant",
  "bg-error-container text-on-error-container",
]

function colorFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
  const sizes = {
    sm: "size-6 text-[10px]",
    md: "size-9 text-sm",
    lg: "size-11 text-base",
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizes[size],
        colorFor(name),
        className,
      )}
      title={name}
    >
      {initials}
    </span>
  )
}
