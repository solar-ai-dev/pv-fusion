import { ReactNode } from 'react'

type ConfirmModalProps = {
  isOpen?: boolean
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  isConfirming?: boolean
  onConfirm?: () => void
  onCancel?: () => void
  children?: ReactNode
}

export function ConfirmModal({
  isOpen = false,
  title = '확인이 필요합니다.',
  description = '현재 작업을 진행할지 확인해 주세요.',
  confirmText = '확인',
  cancelText = '취소',
  isConfirming = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card max-h-[calc(100vh-2rem)] overflow-y-auto">
        <h2 className="panel-title">{title}</h2>
        <p className="panel-description">{description}</p>
        {children}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="btn btn-secondary"
            type="button"
            disabled={isConfirming}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </section>
    </div>
  )
}
