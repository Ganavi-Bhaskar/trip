import { zodResolver } from '@hookform/resolvers/zod'
import { Crown, Ellipsis, Mail, Plus, Tag, Trash2, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api/resources'
import { errorMessage } from '../api/http'
import { Avatar } from '../components/ui/Avatar'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { Traveler } from '../types/models'

const schema = z.object({ email: z.email('Enter a valid email address.'), name: z.string().optional(), preferences: z.string().optional() })
type TravelerForm = z.infer<typeof schema>

export function TravelersPage() {
  const { tripId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { notify } = useToast()
  const [travelers, setTravelers] = useState<Traveler[]>([])
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Traveler | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TravelerForm>({ resolver: zodResolver(schema) })
  const current = travelers.find((traveler) => traveler.user.id === user?.id)
  const isOrganizer = current?.role === 'organizer'

  const load = () => {
    setLoading(true)
    void api.travelers.list(tripId).then((items) => { setTravelers(items); setFailure('') }).catch((error: unknown) => setFailure(errorMessage(error))).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [tripId, retry])
  useEffect(() => { if (searchParams.get('add') === '1' && isOrganizer) { setAddOpen(true); setSearchParams({}, { replace: true }) } }, [searchParams, setSearchParams, isOrganizer])

  const addTraveler = async (values: TravelerForm) => {
    try {
      await api.travelers.add(tripId, { email: values.email, name: values.name || undefined, preferences: values.preferences?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [] })
      notify('Traveler added to your trip!')
      setAddOpen(false); reset(); load()
    } catch (error) { notify(errorMessage(error), 'error') }
  }
  const changeRole = async (traveler: Traveler) => {
    try {
      await api.travelers.update(tripId, traveler.user.id, { role: traveler.role === 'organizer' ? 'member' : 'organizer' })
      notify('Traveler role updated.'); load()
    } catch (error) { notify(errorMessage(error), 'error') }
    finally { setMenu(null) }
  }
  const remove = async () => {
    if (!removeTarget) return
    try { await api.travelers.remove(tripId, removeTarget.user.id); notify('Traveler removed.'); load() }
    catch (error) { notify(errorMessage(error), 'error') }
    finally { setRemoveTarget(null) }
  }

  return <div className="travelers-page page-enter"><div className="page-topline"><Link to={`/trips/${tripId}`} className="back-link">‹ &nbsp;Trip</Link><span className="page-top-kicker">YOUR PEOPLE</span>{isOrganizer && <button className="round-add" aria-label="Add traveler" onClick={() => setAddOpen(true)}><Plus size={19} /></button>}</div><header className="page-heading"><span className="eyebrow">THE BEST PART OF EVERY TRIP</span><h1>Travelers</h1><p>Good company makes every place beautiful.</p></header>
    {loading ? <LoadingState label="Gathering your travel buddies" /> : failure ? <ErrorState message={failure} retry={() => setRetry((value) => value + 1)} /> : travelers.length === 0 ? <EmptyState title="It's a party of one" detail="Invite your favorite people to join the journey." /> : <div className="traveler-list">{travelers.map((traveler) => <article className="traveler-card surface" key={traveler._id}><Avatar user={traveler.user} size="lg" /><div className="traveler-card-copy"><h3>{traveler.user.name}{traveler.user.id === user?.id && <span className="you-label">You</span>}{traveler.role === 'organizer' && <Crown className="organizer-crown" size={15} fill="currentColor" />}</h3><span className="role-label">{traveler.role === 'organizer' ? 'Organizer' : 'Traveler'}{traveler.user.isGuest ? ' · Invited guest' : ''}</span><p>{traveler.preferences.length ? traveler.preferences.join(' · ') : 'Ready for the adventure'}</p></div>{isOrganizer && <div className="traveler-menu-wrap"><button className="icon-button" aria-label={`Options for ${traveler.user.name}`} onClick={() => setMenu(menu === traveler._id ? null : traveler._id)}><Ellipsis size={20} /></button>{menu === traveler._id && <div className="floating-menu"><button onClick={() => void changeRole(traveler)}><Crown size={15} />{traveler.role === 'organizer' ? 'Make traveler' : 'Make organizer'}</button>{traveler.user.id !== user?.id && <button className="menu-danger" onClick={() => { setMenu(null); setRemoveTarget(traveler) }}><Trash2 size={15} />Remove</button>}</div>}</div>}</article>)}</div>}
    <section className="travel-buddies-note"><div className="dotted-flight" aria-hidden="true">· · · · · · · · ✈</div><Tag size={17} /><p>Travel Buddies for Life <span>♥</span></p><small>THE PEOPLE MAKE THE PLACE</small></section>
    {addOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddOpen(false) }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="traveler-dialog-title"><button className="icon-button dialog-close" onClick={() => setAddOpen(false)} aria-label="Close"><X size={18} /></button><span className="dialog-mark"><UserPlus size={19} /></span><h2 id="traveler-dialog-title">Invite a traveler</h2><p>They can join the trip right away, even before creating an account.</p><form className="form-stack" onSubmit={handleSubmit(addTraveler)} noValidate><label className="field"><span>Email address</span><span className="input-wrap"><Mail size={16} /><input type="email" placeholder="friend@example.com" {...register('email')} /></span>{errors.email && <small>{errors.email.message}</small>}</label><label className="field"><span>Name <em>(Optional)</em></span><input placeholder="Aisha" {...register('name')} /></label><label className="field"><span>Travel style <em>(comma separated)</em></span><input placeholder="Explorer, Foodie" {...register('preferences')} /></label><button className="button button-primary button-wide" disabled={isSubmitting}>{isSubmitting ? 'Sending invite…' : 'Add Traveler'}</button></form></section></div>}
    {removeTarget && <ConfirmDialog title="Remove this traveler?" message={errorMessage(new Error('They will no longer see this trip. If their name is part of an expense, you will need to update that first.'))} confirmLabel="Remove traveler" onClose={() => setRemoveTarget(null)} onConfirm={() => void remove()} />}
  </div>
}