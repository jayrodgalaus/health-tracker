import type { EvaluationStatus } from '../../domain/evaluation'

/** A calendar day receives a colored fill only after it has been completed.
 * Colors match the existing status scheme; uncompleted days are neutral.
 * Screen-reader status text is provided by CalendarPage, not shown in the grid.
 */
export function calendarStatusFill(status: EvaluationStatus, completed: boolean): string {
  if (!completed) return 'bg-transparent text-slate-900 hover:bg-slate-100'
  switch (status) {
    case 'onTarget': return 'bg-emerald-100 text-emerald-900'
    case 'mixed': return 'bg-amber-100 text-amber-950'
    case 'offTarget': return 'bg-rose-100 text-rose-900'
    case 'incomplete': return 'bg-slate-200 text-slate-800'
  }
}
