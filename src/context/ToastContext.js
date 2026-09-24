import { createContext } from 'react'

// Holds the `showToast(message, opts?)` function. Consumed via useToast().
export const ToastContext = createContext(null)
