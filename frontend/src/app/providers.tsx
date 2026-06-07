import { PropsWithChildren, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthBootstrap } from '../features/auth/components/AuthBootstrap'
import { ToastProvider } from '../shared/components/feedback/ToastProvider'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthBootstrap />
          {children}
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
