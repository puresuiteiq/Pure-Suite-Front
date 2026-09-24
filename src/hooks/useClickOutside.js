import { useEffect } from 'react'

/**
 * Calls `handler` when a pointer press lands outside `ref`, or on Escape.
 * Listeners attach only while `active` is true (e.g. while a dropdown is open).
 */
export function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return

    function onPointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) handler()
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') handler()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [ref, handler, active])
}
