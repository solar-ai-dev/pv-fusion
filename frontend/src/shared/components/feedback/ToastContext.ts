import { createContext } from 'react'

export type ToastContextValue = {
  push: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
