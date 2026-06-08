import * as React from "react"
import { cn } from "@/lib/utils"

const inputClasses =
  "flex h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} ref={ref} className={cn(inputClasses, className)} {...props} />
  ),
)
Input.displayName = "Input"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(inputClasses, "min-h-20 py-2 resize-y", className)}
    {...props}
  />
))
Textarea.displayName = "Textarea"

export { Input, Textarea, inputClasses }
