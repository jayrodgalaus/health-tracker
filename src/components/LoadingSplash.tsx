import { useEffect, type AnimationEvent } from 'react'
import './LoadingSplash.css'

interface LoadingSplashProps {
  onSettled: () => void
}

export function LoadingSplash({ onSettled }: LoadingSplashProps) {
  // Reduced-motion users should not have to wait for a decorative animation.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onSettled()
    }
  }, [onSettled])

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && event.animationName === 'apple-fall-bounce') {
      onSettled()
    }
  }

  return (
    <div className="loading-splash" role="status" aria-label="Opening Health Tracker">
      <div className="loading-splash__apple" onAnimationEnd={handleAnimationEnd} aria-hidden="true">
        <img src="/apple-splash.webp" alt="" width="242" height="270" decoding="async" />
      </div>
    </div>
  )
}
