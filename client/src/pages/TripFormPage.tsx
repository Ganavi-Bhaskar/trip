import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CalendarDays, Check, Copy, ImagePlus, MapPin, Share2, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api/resources'
import { errorMessage } from '../api/http'
import { LoadingState } from '../components/ui/States'
import { useToast } from '../context/ToastContext'
import { currencyOptions } from '../utils/currencyOptions'
import { mediaUrl } from '../utils/media'
import type { Trip } from '../types/models'

const schema = z.object({
  name: z.string().trim().min(1, 'Please enter a trip name.').max(100),
  destination: z.string().trim().min(1, 'Please enter a destination.').max(120),
  startDate: z.string().min(1, 'Choose a start date.'),
  endDate: z.string().min(1, 'Choose an end date.'),
  currency: z.string().length(3),
  coverImage: z.string().optional(),
  quote: z.string().max(180).optional(),
}).refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, { path: ['endDate'], message: 'End date must be after start date.' })
type FormValues = z.infer<typeof schema>

interface TripSuccessDialogProps {
  trip: Trip
  onClose: () => void
}

function TripSuccessDialog({ trip, onClose }: TripSuccessDialogProps) {
  const navigate = useNavigate()
  const { notify } = useToast()
  const code = trip.invitationCode ?? ''
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      notify('Could not copy. Please copy manually: ' + code)
    }
  }

  const shareInvitation = async () => {
    const text = `Join me on TripSplit for "${trip.name}"! Use code ${code} on the Join a Trip screen.`
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${trip.name} on TripSplit`, text })
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        notify('Invitation text copied to clipboard!')
      } catch {
        notify('Share code: ' + code)
      }
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="dialog trip-created-dialog" role="dialog" aria-modal="true" aria-labelledby="trip-created-title">
        <div className="trip-created-header">
          <div className="trip-created-icon">✈️</div>
          <h2 id="trip-created-title">Trip Created!</h2>
          <p>Share this code with your travel buddies so they can join.</p>
        </div>

        {code && (
          <>
            <div className="invite-code-display-grid" aria-label="Invitation code">
              {code.split('').map((char, i) => (
                <span key={i} className="invite-char-display">{char}</span>
              ))}
            </div>

            <div className="trip-created-actions">
              <button className={`button button-secondary${copied ? ' copied' : ''}`} onClick={() => void copyCode()}>
                {copied ? <><Check size={16} />Copied!</> : <><Copy size={16} />Copy Code</>}
              </button>
              <button className="button button-secondary" onClick={() => void shareInvitation()}>
                <Share2 size={16} />Share Invite
              </button>
            </div>

            <p className="trip-created-hint">
              Your fellow travellers can click <strong>Join a Trip</strong> on the dashboard and enter this code to join <strong>{trip.name}</strong>.
            </p>
          </>
        )}

        <button
          id="open-trip-button"
          className="button button-primary button-wide"
          onClick={() => { navigate(`/trips/${trip._id}`); onClose() }}
        >
          Open Trip
        </button>
      </section>
    </div>
  )
}

export function TripFormPage() {
  const { tripId } = useParams()
  const editing = Boolean(tripId)
  const navigate = useNavigate()
  const { notify } = useToast()
  const [cover, setCover] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverBusy, setCoverBusy] = useState(false)
  const [loadingTrip, setLoadingTrip] = useState(Boolean(tripId))
  const [loadError, setLoadError] = useState('')
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null)
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { currency: 'INR', coverImage: '', quote: '' } })

  useEffect(() => {
    if (!tripId) return
    void api.trips.get(tripId).then(({ trip }) => {
      setValue('name', trip.name)
      setValue('destination', trip.destination)
      setValue('startDate', trip.startDate.slice(0, 10))
      setValue('endDate', trip.endDate.slice(0, 10))
      setValue('currency', trip.currency)
      setValue('coverImage', trip.coverImage ?? '')
      setValue('quote', trip.quote ?? '')
      setCover(trip.coverImage ?? '')
    }).catch((error: unknown) => setLoadError(errorMessage(error))).finally(() => setLoadingTrip(false))
  }, [tripId, setValue])

  const changeCover = async (file?: File) => {
    if (!file) return
    const preview = URL.createObjectURL(file)
    setCover(preview)
    setCoverFile(file)
    if (!editing) return
    setCoverBusy(true)
    try {
      const url = await api.upload('trip-cover', file, tripId)
      setValue('coverImage', url, { shouldDirty: true })
      setCover(url)
      setCoverFile(null)
    } catch (error) {
      notify(errorMessage(error), 'error')
    } finally { setCoverBusy(false) }
  }

  const submit = async (values: FormValues) => {
    try {
      const payload = { ...values, startDate: `${values.startDate}T00:00:00.000Z`, endDate: `${values.endDate}T00:00:00.000Z` }
      let trip = editing ? await api.trips.update(tripId ?? '', payload) : await api.trips.create({ ...payload, coverImage: '' })
      if (!editing && coverFile) {
        try {
          const coverImage = await api.upload('trip-cover', coverFile, trip._id)
          trip = await api.trips.update(trip._id, { coverImage })
        } catch (error) {
          notify(`Trip created, but its cover could not be uploaded: ${errorMessage(error)}`, 'error')
        }
      }
      if (editing) {
        notify('Trip details updated.')
        navigate(`/trips/${trip._id}`)
      } else {
        setCreatedTrip(trip)
      }
    } catch (error) { notify(errorMessage(error), 'error') }
  }

  if (editing && loadingTrip && !loadError) return <LoadingState label="Opening your trip details" />
  if (loadError) return <div className="form-page"><p className="error-state">{loadError}</p></div>

  return (
    <div className="form-page page-enter">
      <Link to={editing ? `/trips/${tripId}` : '/dashboard'} className="back-link"><ArrowLeft size={18} /> Back</Link>
      <header className="form-heading"><span className="eyebrow">MAKE ROOM FOR MEMORIES</span><h1>{editing ? 'Edit your trip' : 'Create a New Trip'}</h1><p>New journey, new memories! <span>♥</span></p></header>
      <form className="trip-form surface" onSubmit={handleSubmit(submit)} noValidate>
        <label className="field"><span>Trip Name</span><input placeholder="Bali Besties" {...register('name')} />{errors.name && <small>{errors.name.message}</small>}</label>
        <label className="field"><span>Destination</span><span className="input-wrap"><MapPin size={17} /><input placeholder="Bali, Indonesia" {...register('destination')} /></span>{errors.destination && <small>{errors.destination.message}</small>}</label>
        <div className="field-row"><label className="field"><span>Start Date</span><span className="input-wrap"><CalendarDays size={17} /><input type="date" {...register('startDate')} /></span>{errors.startDate && <small>{errors.startDate.message}</small>}</label><label className="field"><span>End Date</span><span className="input-wrap"><CalendarDays size={17} /><input type="date" {...register('endDate')} /></span>{errors.endDate && <small>{errors.endDate.message}</small>}</label></div>
        <label className="field"><span>Trip Currency</span><select {...register('currency')}>{currencyOptions.map((currency) => <option value={currency.code} key={currency.code}>{currency.code} ({currency.symbol})</option>)}</select></label>
        <div className="field"><span>Trip Cover <em>(Optional)</em></span><div className={`cover-picker${cover ? ' has-cover' : ''}`} style={cover ? { backgroundImage: `linear-gradient(180deg, rgba(43,40,80,.02), rgba(43,40,80,.18)), url(${mediaUrl(cover)})` } : undefined}>
          {!cover && <div className="cover-empty"><ImagePlus size={26} /><span>A little glimpse of the journey</span></div>}
          <label className="cover-change"><Upload size={16} />{cover ? 'Change' : 'Choose a cover'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void changeCover(event.target.files?.[0])} /></label>
          {cover && <button type="button" className="cover-remove" aria-label="Remove trip cover" onClick={() => { if (cover.startsWith('blob:')) URL.revokeObjectURL(cover); setCover(''); setCoverFile(null); setValue('coverImage', '') }}><Trash2 size={16} /></button>}
          {coverBusy && <span className="cover-uploading">Uploading…</span>}
        </div></div>
        <label className="field"><span>Trip Quote <em>(Optional)</em></span><input placeholder="Good company makes every place beautiful" {...register('quote')} /></label>
        <button className="button button-primary button-wide" disabled={isSubmitting || coverBusy}>{isSubmitting ? 'Saving your plans…' : editing ? 'Save Changes' : 'Create Trip'}</button>
      </form>

      {createdTrip && (
        <TripSuccessDialog
          trip={createdTrip}
          onClose={() => setCreatedTrip(null)}
        />
      )}
    </div>
  )
}