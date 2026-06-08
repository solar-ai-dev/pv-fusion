import { InputHTMLAttributes, ReactNode } from 'react'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
  children?: ReactNode
}

export function FormField({
  label,
  hint,
  error,
  children,
  ...props
}: FormFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      {children ?? <input className="input-field" {...props} />}
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  )
}
