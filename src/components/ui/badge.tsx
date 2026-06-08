import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        open: "bg-secondary-container text-on-secondary-container",
        closed: "bg-surface-container-highest text-on-surface-variant",
        settled: "bg-primary-fixed text-on-primary-fixed-variant dark:text-on-primary-container",
        neutral: "bg-surface-container-high text-on-surface-variant",
        creditor: "bg-secondary-container text-on-secondary-container",
        debtor: "bg-error-container text-on-error-container",
        category: "bg-surface-container-high text-on-surface-variant uppercase tracking-wide",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
