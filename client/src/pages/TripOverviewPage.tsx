import { useEffect, useMemo, useState } from 'react'
import { BedDouble, BookOpen, Camera, ChevronDown, CircleDollarSign, Copy, Ellipsis, MapPin, Pencil, RefreshCw, Share2, Trash2, Users, Wallet, X } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/resources'
import { errorMessage } from '../api/http'
import { Avatar } from '../components/ui/Avatar'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { Activity, Member, Traveler, Trip, TripStats } from '../types/models'
import { formatDate } from '../utils/dates'
import { formatMoney } from '../utils/money'
import { mediaUrl } from '../utils/media'

const chartColors = ['#F06A95', '#7F72E6', '#69B5D4', '#F2C66D', '#54BD94', '#A24FD0']

export function TripOverviewPage() {
  const { tripId = '' } = useParams()
  const { user } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [stats, setStats] = useState<TripStats | null>(null)
  const [travelers, setTravelers] = useState<Traveler[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [summary, setSummary] = useState<{ travelerCount: number; totalExpenses: number; progress: number; totalDays: number; nextUpcomingActivity: Activity | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [retry, setRetry] = useState(0)
  const [codeCopied, setCodeCopied] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([api.trips.get(tripId), api.stats.get(tripId), api.travelers.list(tripId), api.trips.members(tripId)])
      .then(([details, tripStats, people, tripMembers]) => {
        if (!active) return
        setTrip(details.trip)
        setSummary(details)
        setStats(tripStats)
        setTravelers(people)
        setMembers(tripMembers)
        setFailure('')
      }).catch((error: unknown) => { if (active) setFailure(errorMessage(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [tripId, retry])

  const isOrganizer = useMemo(() => travelers.some((person) => person.user.id === user?.id && person.role === 'organizer'), [travelers, user?.id])

  const deleteTrip = async () => {
    setDeleting(true)
    try {
      await api.trips.remove(tripId)
      notify('Trip deleted.')
      navigate('/dashboard')
    } catch (error) { notify(errorMessage(error), 'error') }
    finally { setDeleting(false); setConfirmDelete(false) }
  }

  const copyCode = async () => {
    if (!trip?.invitationCode) return
    try {
      await navigator.clipboard.writeText(trip.invitationCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch { notify('Code: ' + trip.invitationCode) }
  }

  const shareCode = async () => {
    if (!trip?.invitationCode) return
    const text = `Join me on TripSplit for "${trip.name}"! Use code ${trip.invitationCode} on the Join a Trip screen.`
    if (navigator.share) {
      try { await navigator.share({ title: `Join ${trip.name}`, text }) } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(text); notify('Invitation copied to clipboard!') } catch { notify('Code: ' + trip.invitationCode) }
    }
  }

  const regenerateCode = async () => {
    setCodeLoading(true)
    try {
      const updated = await api.trips.regenerateCode(tripId)
      setTrip(updated)
      notify('New invitation code generated.')
    } catch (error) { notify(errorMessage(error), 'error') }
    finally { setCodeLoading(false) }
  }

  const revokeCode = async () => {
    setCodeLoading(true)
    try {
      const updated = await api.trips.revokeCode(tripId)
      setTrip(updated)
      notify('Invitation link revoked. Existing members are unaffected.')
      setShowRevokeConfirm(false)
    } catch (error) { notify(errorMessage(error), 'error') }
    finally { setCodeLoading(false) }
  }

  if (loading) return <LoadingState label="Opening your trip journal" />
  if (failure || !trip || !summary || !stats) return <div className="page-wrap"><ErrorState message={failure || 'This trip is not available.'} retry={() => setRetry((value) => value + 1)} /></div>

  const quickActions = [
    { label: 'Itinerary', icon: BookOpen, path: 'itinerary', tint: 'blue' },
    { label: 'Expenses', icon: Wallet, path: 'expenses', tint: 'pink' },
    { label: 'Travelers', icon: Users, path: 'travelers', tint: 'mint' },
    { label: 'Photos', icon: Camera, path: 'photos', tint: 'lavender' },
  ]

  return <div className="overview-page page-enter">
    <section className="trip-hero" style={trip.coverImage ? { backgroundImage: `linear-gradient(90deg, rgba(39,38,70,.65), rgba(39,38,70,.08)), url(${mediaUrl(trip.coverImage)})` } : undefined}>
      <div className="trip-hero-top"><Link to="/dashboard" className="glass-icon" aria-label="Back to trips"><ChevronDown className="back-chevron" size={19} /></Link><button className="glass-icon" aria-label="Trip options" onClick={() => setMenuOpen((open) => !open)}><Ellipsis size={21} /></button>
        {menuOpen && <div className="trip-menu">{isOrganizer && <><Link to={`/trips/${tripId}/edit`}><Pencil size={16} />Edit trip</Link><button className="menu-danger" onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}><Trash2 size={16} />Delete trip</button></>}<button onClick={() => { void navigator.clipboard?.writeText(window.location.href); notify('Trip link copied!') }}>Copy trip link</button></div>}
      </div>
      <div className="trip-hero-copy"><span className="trip-location"><MapPin size={15} />{trip.destination}</span><h1>{trip.name} <span>♥</span></h1><p className="trip-dates">{formatDate(trip.startDate, { day: 'numeric', month: 'short' })} <span>→</span> {formatDate(trip.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}</p><span className="trip-quote">"{trip.quote || 'Good company makes every place beautiful'}" <span>♥</span></span></div>
    </section>
    <div className="overview-content">
      <div className="overview-main-column">
        <div className="quick-tile-row">{quickActions.map(({ label, icon: Icon, path, tint }) => <Link to={`/trips/${tripId}/${path}`} className={`quick-tile quick-${tint}`} key={label}><span><Icon size={21} /></span><b>{label}</b></Link>)}</div>
        <section className="surface progress-card"><div className="card-heading"><div><span className="eyebrow">YOUR LITTLE ADVENTURE</span><h2>Trip Progress</h2></div><span className="progress-count">{summary.progress}/{summary.totalDays} days</span></div><div className="progress-track"><span style={{ width: `${Math.min(100, (summary.progress / summary.totalDays) * 100)}%` }} /></div><p>{summary.progress >= summary.totalDays ? 'What a wonderful journey.' : `${Math.max(0, summary.totalDays - summary.progress)} days of possibility ahead`}</p></section>
        <Link className="surface expense-total-card" to={`/trips/${tripId}/expenses`}><span className="money-sticker"><Wallet size={22} /></span><span><small>Total trip expenses</small><strong>{formatMoney(summary.totalExpenses, trip.currency)}</strong></span><span className="pill-link">View details <ChevronDown size={14} /></span></Link>
        <section className="surface upcoming-card"><div className="card-heading"><div><span className="eyebrow">NEXT ON THE MAP</span><h2>Upcoming</h2></div><span className="today-tag">Today <span>✦</span></span></div>{summary.nextUpcomingActivity ? <Upcoming activity={summary.nextUpcomingActivity} /> : <EmptyState title="A little breathing room" detail="Your next stop will show here when it is on the itinerary." />}</section>

        {/* Invitation Code Panel */}
        {isOrganizer && (
          <section className="surface invite-panel">
            <div className="card-heading">
              <div><span className="eyebrow">SHARE THE ADVENTURE</span><h2>Invitation Code</h2></div>
            </div>
            {trip.invitationActive && trip.invitationCode ? (
              <>
                <div className="invite-code-display-grid" style={{ marginBottom: '12px' }}>
                  {trip.invitationCode.split('').map((char, i) => (
                    <span key={i} className="invite-char-display">{char}</span>
                  ))}
                </div>
                <p className="invite-panel-hint">Share this code with travellers so they can join via the <strong>Join a Trip</strong> button on their dashboard.</p>
                <div className="invite-panel-actions">
                  <button className="button button-secondary" onClick={() => void copyCode()} disabled={codeLoading}>
                    <Copy size={15} />{codeCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button className="button button-secondary" onClick={() => void shareCode()} disabled={codeLoading}>
                    <Share2 size={15} />Share
                  </button>
                  <button className="button button-secondary" onClick={() => void regenerateCode()} disabled={codeLoading}>
                    <RefreshCw size={15} />{codeLoading ? '…' : 'New Code'}
                  </button>
                  <button className="button button-ghost text-danger" onClick={() => setShowRevokeConfirm(true)} disabled={codeLoading}>
                    <X size={15} />Revoke
                  </button>
                </div>
              </>
            ) : (
              <div className="invite-revoked">
                <p>Invitation is currently <strong>revoked</strong>. New travellers cannot join. Existing members are unaffected.</p>
                <button className="button button-secondary" onClick={() => void regenerateCode()} disabled={codeLoading}>
                  <RefreshCw size={15} />{codeLoading ? 'Generating…' : 'Generate New Code'}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
      <aside className="overview-rail">
        <section className="surface traveler-mini-card">
          <div className="card-heading"><h2>Travelers</h2><Link to={`/trips/${tripId}/travelers`}>See all</Link></div>
          <div className="traveler-avatar-row">{members.slice(0, 5).map((m) => <Avatar user={m.user} size="md" ring key={m._id} />)}<span className="traveler-count">{members.length}</span></div>
          <p>{members.map((m) => m.user.name.split(' ')[0]).join(' · ')}</p>
        </section>
        <section className="surface spending-card"><div className="card-heading"><div><span className="eyebrow">THE LITTLE DETAILS</span><h2>Spending</h2></div><Link aria-label="Open balance summary" to={`/trips/${tripId}/balances`}><CircleDollarSign size={18} /></Link></div>{stats.spendingByCategory.length ? <><div className="spending-chart"><ResponsiveContainer width="100%" height="156"><PieChart><Pie data={stats.spendingByCategory} dataKey="total" nameKey="category" innerRadius={48} outerRadius={69} paddingAngle={4} stroke="none">{stats.spendingByCategory.map((entry, index) => <Cell key={entry.category} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => formatMoney(Number(value), trip.currency)} /></PieChart></ResponsiveContainer><span className="chart-total">{formatMoney(stats.totalExpenses, trip.currency)}</span></div><div className="category-legend">{stats.spendingByCategory.slice(0, 4).map((entry, index) => <span key={entry.category}><i style={{ background: chartColors[index % chartColors.length] }} />{entry.category}</span>)}</div></> : <EmptyState title="No spending yet" detail="Your expenses will gather here." />}</section>
        <div className="quote-card"><span>"</span><p>Good company makes every place beautiful.</p><small>YOUR TRAVEL NOTE <span>♥</span></small></div>
      </aside>
    </div>
    {confirmDelete && <ConfirmDialog title="Let this trip go?" message="The trip and its itinerary, expenses, settlements and photos will be permanently removed." confirmLabel="Delete trip" busy={deleting} onClose={() => setConfirmDelete(false)} onConfirm={() => void deleteTrip()} />}
    {showRevokeConfirm && <ConfirmDialog title="Revoke invitation?" message="New travellers won't be able to join with the current code. Existing members will not be removed." confirmLabel="Revoke" busy={codeLoading} onClose={() => setShowRevokeConfirm(false)} onConfirm={() => void revokeCode()} />}
  </div>
}

function Upcoming({ activity }: { activity: Activity }) {
  return <div className="upcoming-item"><span className="upcoming-icon"><BedDouble size={21} /></span><div><strong>{activity.title}</strong><p>{activity.time} <span>•</span> {activity.location || 'Somewhere lovely'}</p></div><span className="upcoming-day">Day {activity.day}</span></div>
}