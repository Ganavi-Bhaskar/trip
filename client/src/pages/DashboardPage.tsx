import { useEffect, useState } from 'react'
import { ArrowUpRight, MapPin, Plus, Search, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../api/resources'
import { errorMessage } from '../api/http'
import { Avatar } from '../components/ui/Avatar'
import { JoinTripModal } from '../components/ui/JoinTripModal'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { useAuth } from '../context/AuthContext'
import type { Trip } from '../types/models'
import { formatDate } from '../utils/dates'
import { mediaUrl } from '../utils/media'

export function DashboardPage() {
  const { user } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [joinOpen, setJoinOpen] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    const timer = window.setTimeout(() => {
      void api.trips.list(search).then((data) => { if (active) { setTrips(data); setError('') } })
        .catch((reason: unknown) => { if (active) setError(errorMessage(reason)) })
        .finally(() => { if (active) setLoading(false) })
    }, search ? 260 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [search, retry])

  const myTrips = trips.filter((t) => {
    const org = typeof t.organizer === 'object' ? t.organizer : null
    return org?.id === user?.id
  })
  const sharedTrips = trips.filter((t) => {
    const org = typeof t.organizer === 'object' ? t.organizer : null
    return org?.id !== user?.id
  })

  return <div className="dashboard-page page-enter">
    <section className="dashboard-heading">
      <div>
        <p className="eyebrow">YOUR TRAVEL JOURNAL</p>
        <h1>Where to next, {user?.name?.split(' ')[0] ?? 'traveler'}?</h1>
        <p className="muted">Good friends make every destination better.</p>
      </div>
      <div className="dashboard-heading-actions">
        <button className="button button-secondary join-trip-button" onClick={() => setJoinOpen(true)}>
          <Users size={16} />Join a Trip
        </button>
        <Link className="button button-primary create-trip-button" to="/trips/new">
          <Plus size={18} />Plan a trip
        </Link>
      </div>
    </section>

    <div className="trip-search">
      <Search size={18} />
      <input aria-label="Search trips" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a trip or destination" />
      <kbd>⌘ K</kbd>
    </div>

    {loading ? <LoadingState label="Finding your adventures" />
      : error ? <ErrorState message={error} retry={() => setRetry((value) => value + 1)} />
      : trips.length === 0 ? (
        <EmptyState
          title={search ? 'No trips found' : 'Your next story starts here'}
          detail={search ? 'Try another trip name or destination.' : 'Create a trip or enter an invitation code to join one.'}
          action={!search && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link className="button button-primary" to="/trips/new"><Plus size={17} />Create your first trip</Link>
              <button className="button button-secondary" onClick={() => setJoinOpen(true)}><Users size={16} />Join a Trip</button>
            </div>
          )}
        />
      ) : (
        <>
          {myTrips.length > 0 && (
            <>
              <div className="section-heading">
                <div><h2>My Trips</h2><p>{myTrips.length} adventure{myTrips.length === 1 ? '' : 's'} you&apos;re organising</p></div>
              </div>
              <div className="trip-grid">{myTrips.map((trip, index) => <TripCard trip={trip} key={trip._id} index={index} />)}</div>
            </>
          )}
          {sharedTrips.length > 0 && (
            <>
              <div className="section-heading" style={{ marginTop: myTrips.length > 0 ? '28px' : undefined }}>
                <div><h2>Shared With Me</h2><p>{sharedTrips.length} trip{sharedTrips.length === 1 ? '' : 's'} you&apos;ve joined</p></div>
              </div>
              <div className="trip-grid">{sharedTrips.map((trip, index) => <TripCard trip={trip} key={trip._id} index={index} shared />)}</div>
            </>
          )}
        </>
      )
    }

    <section className="dashboard-note">
      <span className="note-star"><Sparkles size={20} /></span>
      <div><p>Little plans, lasting memories.</p><span>Same people, new places, happier us.</span></div>
      <span className="note-doodle">✿</span>
    </section>

    {joinOpen && <JoinTripModal onClose={() => { setJoinOpen(false); setRetry((v) => v + 1) }} />}
  </div>
}

function TripCard({ trip, index, shared }: { trip: Trip; index: number; shared?: boolean }) {
  return <Link className={`trip-card trip-card-${index % 4}`} to={`/trips/${trip._id}`}>
    <div className="trip-card-cover" style={trip.coverImage ? { backgroundImage: `linear-gradient(180deg, transparent 35%, rgba(43,40,80,.62)), url(${mediaUrl(trip.coverImage)})` } : undefined}>
      {shared && <span className="trip-card-badge shared-badge"><Users size={11} />Shared</span>}
      <span className="trip-card-status">{new Date(trip.endDate) < new Date() ? 'Memory made' : 'On the calendar'}</span>
      <span className="trip-card-arrow"><ArrowUpRight size={19} /></span>
      <div className="trip-card-title"><span>{trip.destination}</span><h3>{trip.name} <span>♥</span></h3></div>
    </div>
    <div className="trip-card-footer">
      <span><MapPin size={15} />{formatDate(trip.startDate, { day: 'numeric', month: 'short' })} – {formatDate(trip.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      <Avatar user={typeof trip.organizer === 'object' ? trip.organizer : undefined} size="sm" />
    </div>
  </Link>
}