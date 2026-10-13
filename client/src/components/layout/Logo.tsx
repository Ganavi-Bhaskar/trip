import { Plane } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Logo({ compact = false }: { compact?: boolean }) {
  return <Link to="/" className={`brand${compact ? ' brand-compact' : ''}`} aria-label="TripSplit home">
    <span className="brand-plane"><Plane size={20} /></span><span className="brand-word"><strong>Trip</strong><b>Split</b></span>
    {!compact && <span className="brand-trail" aria-hidden="true">· · ·</span>}
  </Link>
}