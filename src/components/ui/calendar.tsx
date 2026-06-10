import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      fixedWeeks
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center items-center h-9",
        caption_label: "text-sm font-semibold capitalize",
        nav: "absolute top-0 inset-x-0 flex items-center justify-between h-9 px-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-on-surface-variant rounded-md w-8 font-normal text-[0.8rem] text-center",
        week: "flex w-full mt-2",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100",
        ),
        range_end: "day-range-end",
        selected:
          "[&>button]:bg-primary [&>button]:text-on-primary [&>button]:hover:bg-primary [&>button]:hover:text-on-primary [&>button]:focus:bg-primary [&>button]:focus:text-on-primary",
        today: "[&>button]:bg-surface-container-high [&>button]:font-semibold",
        outside:
          "day-outside [&>button]:text-on-surface-variant [&>button]:aria-selected:bg-primary/50 [&>button]:aria-selected:text-on-primary",
        disabled: "[&>button]:text-on-surface-variant [&>button]:opacity-50",
        range_middle:
          "aria-selected:bg-primary-fixed aria-selected:text-on-primary-fixed-variant",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
