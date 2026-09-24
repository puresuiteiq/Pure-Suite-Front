import { useCallback, useState } from 'react'

/**
 * Confirmation state for signing out.
 *
 * Sign out sits one click away in several places at once — the merchant rail,
 * the merchant topbar, the admin user menu — and it's destructive enough to be
 * worth a deliberate second step rather than losing your session to a misclick.
 *
 * Each app shell owns a single instance and hands `request` to every sign-out
 * control it renders, so one dialog serves them all instead of each button
 * growing its own copy. Pair with <ConfirmDialog>.
 */
export function useSignOutConfirm(logout) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const request = useCallback(() => setOpen(true), [])
  const cancel = useCallback(() => setOpen(false), [])

  const confirm = useCallback(async () => {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      // On success the route guard swaps this shell out, so these land on an
      // unmounted component and are ignored; they matter when logout fails and
      // the shell is still here.
      setSigningOut(false)
      setOpen(false)
    }
  }, [logout])

  return { open, signingOut, request, cancel, confirm }
}
