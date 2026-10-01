import * as React from "react"

// The sidebar switches to the compact bottom navigation on phones and tablets.
const MOBILE_BREAKPOINT = 1024

export function useIsMobile() {
  const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

  return React.useSyncExternalStore(
    (onChange) => {
      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener("change", onChange)
      return () => mediaQuery.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
