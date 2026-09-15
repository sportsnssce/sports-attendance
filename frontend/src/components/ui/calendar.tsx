import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

/**
 * shadcn-style Calendar adapted to this app's Tailwind v4 tokens
 * (accent/surface/card/border/brand-*) and react-day-picker v10's classNames keys.
 * Safe to merge extra `components` (e.g. a DayButton with session dots) — those win.
 */
export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, components, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: 'w-full',
        months: 'w-full',
        month: 'w-full',
        month_caption: 'flex justify-center pt-1 relative items-center h-9',
        hidden: 'invisible',
        caption_label: 'font-display text-sm font-semibold text-brand-900',
        nav: 'space-x-1 flex items-center z-10',
        button_previous: cn(buttonVariants({ variant: 'ghost' }), 'h-7 w-7 p-0 opacity-70 hover:opacity-100 absolute left-1'),
        button_next: cn(buttonVariants({ variant: 'ghost' }), 'h-7 w-7 p-0 opacity-70 hover:opacity-100 absolute right-1'),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday: 'w-9 font-mono text-[0.7rem] font-medium uppercase text-slate-400',
        week: 'flex w-full mt-0.5',
        day: 'h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        selected: 'bg-accent text-white hover:bg-accent-light shadow-sm',
        today: 'ring-1 ring-inset ring-accent ring-offset-0',
        outside: 'day-outside text-slate-300 opacity-60',
        disabled: 'text-slate-300 opacity-50',
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => (
          orientation === 'left'
            ? <ChevronLeft className={cn('h-4 w-4', className)} {...props} />
            : <ChevronRight className={cn('h-4 w-4', className)} {...props} />
        ),
        ...components,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }