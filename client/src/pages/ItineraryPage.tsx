import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Camera, Clock3, Ellipsis, MapPin, Pencil, Plane, Plus, Sun, Trash2, Utensils, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api/resources'
import { errorMessage } from '../api/http'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { useToast } from '../context/ToastContext'
import type { Activity, Trip } from '../types/models'
import { activityCategories } from '../utils/categories'
import { formatDate, formatTime, inclusiveDays, tripDateForDay } from '../utils/dates'
import { quoteForDay } from '../utils/quotes'

const schema = z.object({
  title: z.string().trim().min(1, 'Give this stop a name.').max(120),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid time.'),
  location: z.string().max(160),
  category: z.enum(['transport', 'food', 'stay', 'activity', 'sightseeing', 'shopping', 'other']),
  description: z.string().max(1000),
})
type ActivityForm = z.infer<typeof schema>

export function ItineraryPage() {
  const { tripId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { notify } = useToast()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [day, setDay] = useState(1)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [removing, setRemoving] = useState<Activity | null>(null)
  const [menuActivity, setMenuActivity] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ActivityForm>({ resolver: zodResolver(schema), defaultValues: { title: '', time: '10:00', location: '', category: 'activity', description: '' } })

  useEffect(() => {
    if (searchParams.get('add') === '1') { setModal(true); setSearchParams({}, { replace: true }) }
  }, [searchParams, setSearchParams])
  useEffect(() => {
    let active = true
    setLoading(true)
    void api.trips.get(tripId).then(({ trip: value }) => { if (active) setTrip(value) }).catch((error: unknown) => { if (active) setFailure(errorMessage(error)) })
    void api.activities.list(tripId, day).then((items) => { if (active) { setActivities(items); setFailure('') } }).catch((error: unknown) => { if (active) setFailure(errorMessage(error)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [tripId, day, retry])

  const openAdd = () => { setEditing(null); reset({ title: '', time: '10:00', location: '', category: 'activity', description: '' }); setModal(true) }
  const openEdit = (activity: Activity) => { setEditing(activity); reset({ title: activity.title, time: activity.time, location: activity.location, category: activity.category as ActivityForm['category'], description: activity.description }); setMenuActivity(null); setModal(true) }
  const save = async (values: ActivityForm) => {
    try {
      if (editing) await api.activities.update(editing._id, { ...values, day })
      else await api.activities.create(tripId, { ...values, day, icon: values.category })
      const items = await api.activities.list(tripId, day)
      setActivities(items)
      notify(editing ? 'Activity updated.' : 'Activity added to your itinerary!')
      setModal(false)
    } catch (error) { notify(errorMessage(error), 'error') }
  }
  const remove = async () => {
    if (!removing) return
    try { await api.activities.remove(removing._id); setActivities((items) => items.filter((item) => item._id !== removing._id)); notify('Activity removed.') }
    catch (error) { notify(errorMessage(error), 'error') }
    finally { setRemoving(null) }
  }

  if (loading && !trip) return <LoadingState label="Unfolding your itinerary" />
  if (failure && !trip) return <div className="page-wrap"><ErrorState message={failure} retry={() => setRetry((value) => value + 1)} /></div>
  if (!trip) return null
  const totalDays = inclusiveDays(trip.startDate, trip.endDate)
  const date = tripDateForDay(trip.startDate, day)
  return <div className="itinerary-page page-enter">
    <div className="page-topline"><Link to={`/trips/${tripId}`} className="back-link"><ArrowLeft size={18} /> Trip</Link><span className="page-top-kicker">{trip.name}</span></div>
    <header className="page-heading"><span className="eyebrow">A DAY WELL SPENT</span><h1>Itinerary</h1><p>Every stop is better with your favorite people.</p></header>
    <div className="day-tabs" role="tablist" aria-label="Trip days">{Array.from({ length: totalDays }, (_, index) => index + 1).map((number) => <button role="tab" aria-selected={number === day} className={number === day ? 'active' : ''} key={number} onClick={() => setDay(number)}>Day {number}</button>)}</div>
    <div className="day-intro"><div><h2>Day {day}</h2><span>{formatDate(date, { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' })}</span></div><p>{quoteForDay(day)} <span>♥</span></p></div>
    {failure ? <ErrorState message={failure} retry={() => setRetry((value) => value + 1)} /> : loading ? <LoadingState label="Finding your stops" /> : activities.length ? <div className="timeline">{activities.map((activity) => <ActivityRow key={activity._id} activity={activity} menuOpen={menuActivity === activity._id} onMenu={() => setMenuActivity(menuActivity === activity._id ? null : activity._id)} onEdit={() => openEdit(activity)} onDelete={() => { setMenuActivity(null); setRemoving(activity) }} />)}</div> : <EmptyState title="A page still unwritten" detail="Add a stop, a meal, or leave room for a little wonder." action={<button className="button button-primary" onClick={openAdd}><Plus size={17} />Add an activity</button>} />}
    <button className="button button-primary button-wide itinerary-add" onClick={openAdd}><Plus size={19} />Add Activity</button>
    {modal && <ActivityModal editing={editing} register={register} errors={errors} submitting={isSubmitting} onSubmit={handleSubmit(save)} onClose={() => setModal(false)} />}
    {removing && <ConfirmDialog title="Remove this stop?" message={`${removing.title} will be removed from Day ${removing.day}.`} confirmLabel="Remove activity" onClose={() => setRemoving(null)} onConfirm={() => void remove()} />}
  </div>
}

function ActivityRow({ activity, menuOpen, onMenu, onEdit, onDelete }: { activity: Activity; menuOpen: boolean; onMenu: () => void; onEdit: () => void; onDelete: () => void }) {
  const Icon = activity.category === 'transport' ? Plane : activity.category === 'food' ? Utensils : activity.category === 'sightseeing' ? Sun : Camera
  return <article className="timeline-entry"><div className="timeline-time">{formatTime(activity.time)}</div><span className="timeline-dot" /><div className="activity-card"><span className={`activity-icon activity-${activity.category}`}><Icon size={20} /></span><div className="activity-copy"><h3>{activity.title}</h3><p><MapPin size={14} />{activity.location || 'Location to be decided'}</p>{activity.description && <span className="activity-description">{activity.description}</span>}</div><button className="icon-button activity-menu-button" aria-label={`Options for ${activity.title}`} onClick={onMenu}><Ellipsis size={19} /></button>{menuOpen && <div className="floating-menu"><button onClick={onEdit}><Pencil size={15} />Edit</button><button className="menu-danger" onClick={onDelete}><Trash2 size={15} />Delete</button></div>}</div></article>
}

function ActivityModal({ editing, register, errors, submitting, onSubmit, onClose }: {
  editing: Activity | null; register: ReturnType<typeof useForm<ActivityForm>>['register']; errors: ReturnType<typeof useForm<ActivityForm>>['formState']['errors']; submitting: boolean; onSubmit: React.FormEventHandler<HTMLFormElement>; onClose: () => void
}) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="dialog activity-dialog" role="dialog" aria-modal="true" aria-labelledby="activity-title"><button className="icon-button dialog-close" aria-label="Close" onClick={onClose}><X size={18} /></button><span className="eyebrow">PLAN A LITTLE MOMENT</span><h2 id="activity-title">{editing ? 'Edit Activity' : 'Add Activity'}</h2><form className="form-stack" onSubmit={onSubmit} noValidate>
    <label className="field"><span>Activity name</span><input placeholder="Sunset at the beach" {...register('title')} />{errors.title && <small>{errors.title.message}</small>}</label>
    <div className="field-row"><label className="field"><span>Time</span><span className="input-wrap"><Clock3 size={16} /><input type="time" {...register('time')} /></span>{errors.time && <small>{errors.time.message}</small>}</label><label className="field"><span>Category</span><select {...register('category')}>{activityCategories.map((category) => <option value={category.key} key={category.key}>{category.label}</option>)}</select></label></div>
    <label className="field"><span>Location</span><span className="input-wrap"><MapPin size={16} /><input placeholder="Seminyak Beach" {...register('location')} /></span></label><label className="field"><span>A little detail <em>(Optional)</em></span><textarea rows={3} placeholder="Anything your friends should know?" {...register('description')} /></label>
    <button className="button button-primary button-wide" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Save Activity' : 'Add to Itinerary'}</button>
  </form></section></div>
}