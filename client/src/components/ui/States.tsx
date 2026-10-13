import { AlertCircle, Compass, LoaderCircle } from 'lucide-react'

export function LoadingState({ label = 'Gathering your trip details' }: { label?: string }) {
  return <div className="loading-state"><LoaderCircle className="spin" size={24} /><span>{label}</span></div>
}

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Compass size={24} /></span><h3>{title}</h3>{detail && <p>{detail}</p>}{action}</div>
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="error-state"><AlertCircle size={22} /><span>{message}</span><button className="text-button" onClick={retry}>Try again</button></div>
}