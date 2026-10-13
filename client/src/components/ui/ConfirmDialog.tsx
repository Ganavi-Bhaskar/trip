import { X } from 'lucide-react'

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onClose, busy = false }: {
  title: string; message: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void; busy?: boolean
}) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <button className="icon-button dialog-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
      <span className="dialog-mark">♥</span><h2 id="dialog-title">{title}</h2><p>{message}</p>
      <div className="dialog-actions"><button className="button button-secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="button button-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Please wait…' : confirmLabel}</button></div>
    </section>
  </div>
}