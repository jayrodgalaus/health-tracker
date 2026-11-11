import type { SVGProps } from 'react'

/** One consistent set of icons for Settings rows and their detail-page headers. */
export type SettingsSectionName = 'profile' | 'goals' | 'preferences' | 'data' | 'docs' | 'about'

export function SettingsSectionIcon({
  name, ...props
}: { name: SettingsSectionName } & Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return <svg aria-hidden="true" viewBox="0 0 48 48" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    strokeLinejoin="round" {...props}>
    {name === 'profile' && <>
      <circle cx="24" cy="17" r="8" />
      <path d="M9 40c1.5-8 7.5-12 15-12s13.5 4 15 12" />
    </>}
    {name === 'goals' && <>
      <circle cx="23" cy="25" r="17" />
      <circle cx="23" cy="25" r="10" />
      <circle cx="23" cy="25" r="3" />
      <path d="m26 22 16-16M33 6h9v9" />
    </>}
    {name === 'preferences' && <>
      <path d="M8 10h32M8 24h32M8 38h32" />
      <circle cx="18" cy="10" r="4" fill="currentColor" stroke="none" />
      <circle cx="31" cy="24" r="4" fill="currentColor" stroke="none" />
      <circle cx="20" cy="38" r="4" fill="currentColor" stroke="none" />
    </>}
    {name === 'data' && <>
      <ellipse cx="24" cy="10" rx="15" ry="6" />
      <path d="M9 10v13c0 3.3 6.7 6 15 6s15-2.7 15-6V10M9 23v13c0 3.3 6.7 6 15 6s15-2.7 15-6V23" />
    </>}
    {name === 'docs' && <>
      <path d="M24 11c-5-4-11-5-18-3v30c7-2 13-1 18 3 5-4 11-5 18-3V8c-7-2-13-1-18 3z" />
      <path d="M24 11v30M11 17c3-.5 6 0 9 1M28 18c3-1 6-1.5 9-1" />
    </>}
    {name === 'about' && <>
      <path d="M24 43 8.5 28.5C-1 19 13 5 24 17c11-12 25-2 15.5 11.5z" />
      <path d="M24 19v12M18 25h12" />
    </>}
  </svg>
}
