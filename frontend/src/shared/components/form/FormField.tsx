import { InputHTMLAttributes } from 'react'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
}

export function FormField({ label, hint, ...props }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      <input className="input-field" {...props} />
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  )
}
