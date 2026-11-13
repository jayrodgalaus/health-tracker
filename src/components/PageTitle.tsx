import type { ReactNode } from 'react'
import { PageInfoLink, type DocsTopic } from './PageInfoLink'

/** Keep the help link visually next to the title without changing its accessible name. */
export function PageTitle({
  topic, children, className = '', titleClassName = 'text-3xl font-bold tracking-tight'
}: {
  topic: DocsTopic
  children: ReactNode
  className?: string
  titleClassName?: string
}) {
  return <div className={'flex min-w-0 items-start gap-1 ' + className}>
    <h1 className={'min-w-0 ' + titleClassName}>{children}</h1>
    <PageInfoLink topic={topic} />
  </div>
}
