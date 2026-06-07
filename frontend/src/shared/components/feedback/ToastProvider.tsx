import { PropsWithChildren, useMemo, useState } from 'react'
import { ToastContext, type ToastContextValue } from './ToastContext'

type ToastMessage = {
  id: number
  message: string
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const value = useMemo<ToastContextValue>(
    () => ({
      push: (message: string) => {
        const entry = { id: Date.now(), message }
        setMessages((current) => [...current, entry])
        window.setTimeout(() => {
          setMessages((current) =>
            current.filter((item) => item.id !== entry.id),
          )
        }, 2500)
      },
    }),
    [],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack">
        {messages.map((item) => (
          <div key={item.id} className="toast-card">
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
