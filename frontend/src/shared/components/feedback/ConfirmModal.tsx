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
  description = '실제 연결 전 단계에서 사용하는 기본 확인 모달입니다.',
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
      <section className="modal-card">
        <h2 className="panel-title">{title}</h2>
        <p className="panel-description">{description}</p>
        {children}
        <div className="mt-6 flex justify-end gap-3">
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
