import { useContext } from 'react'
import {
  ToastContext,
  ToastContextValue,
} from '../components/feedback/ToastContext'

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
