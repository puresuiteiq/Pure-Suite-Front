import { useContext } from 'react'
import { ToastContext } from '../context/ToastContext'

/**
 * Returns `showToast(message, { type, duration })`. Falls back to a no-op when
 * rendered outside a ToastProvider, so a component can call it unconditionally.
 */
export function useToast() {
  return useContext(ToastContext) ?? (() => {})
}
