import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownUp, ArrowLeft, BedDouble, CalendarDays, Check, ChevronDown, Filter, Pencil, Plus, ShoppingBag, Sparkles, Ticket, Trash2, Utensils, Wallet, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api/resources'
import { errorMessage } from '../api/http'
import { Avatar } from '../components/ui/Avatar'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { Expense, Traveler, Trip } from '../types/models'
import { formatDate, inclusiveDays } from '../utils/dates'
import { currencyOptions } from '../utils/currencyOptions'
import { formatMoney, toMinorUnits } from '../utils/money'
import { percentagesFromWeights, sharesFromPercentages } from '../utils/splitPercentages'

const expenseSchema = z.object({
  description: z.string().trim().min(1, 'Please enter an expense description.'),
  amount: z.number().positive('Enter an amount greater than zero.'),
  currency: z.string().length(3),
  exchangeRate: z.number().positive().optional(),
  category: z.enum(['food', 'stay', 'transport', 'activities', 'shopping', 'other']),
  paidBy: z.string().min(1, 'Choose who paid.'),
  date: z.string().min(1, 'Choose a date.'),
  splitType: z.enum(['equal', 'percentage', 'exact']),
  participants: z.array(z.string()).min(1, 'Select at least one traveler.'),
  values: z.record(z.string(), z.number().min(0)),
}).superRefine((form, context) => {
  if (form.splitType !== 'percentage') return

  let totalBasisPoints = 0
  for (const id of form.participants) {
    const value = form.values[id]
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      context.addIssue({ code: 'custom', path: ['values', id], message: 'Enter a percentage between 0 and 100.' })
      continue
    }
    const basisPoints = Math.round(value * 100)
    if (Math.abs(value * 100 - basisPoints) > 1e-7) {
      context.addIssue({ code: 'custom', path: ['values', id], message: 'Use no more than two decimal places.' })
    }
    totalBasisPoints += basisPoints
  }
  if (totalBasisPoints !== 10000) {
    context.addIssue({ code: 'custom', path: ['values'], message: 'Custom percentages must add up to exactly 100%.' })
  }
})
type ExpenseFormValues = z.infer<typeof expenseSchema>
const filterOptions = [['all', 'All'], ['food', 'Food'], ['stay', 'Stay'], ['transport', 'Transport'], ['activities', 'Activities'], ['shopping', 'Shopping'], ['other', 'Other']]

export function ExpensesPage() {
  const { tripId = '' } = useParams()
  const { user } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [trip, setTrip] = useState<Trip | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [travelers, setTravelers] = useState<Traveler[]>([])
  const [active, setActive] = useState<Expense | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState('')
  const [retry, setRetry] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const [details, items, people] = await Promise.all([api.trips.get(tripId), api.expenses.list(tripId, category), api.travelers.list(tripId)])
      setTrip(details.trip); setExpenses(items); setTravelers(people); setFailure('')
    } catch (error) { setFailure(errorMessage(error)) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [tripId, category, retry])

  const visible = useMemo(() => expenses.filter((expense) => expense.description.toLowerCase().includes(search.toLowerCase())), [expenses, search])
  const total = visible.reduce((sum, expense) => sum + expense.amountInTripCurrency, 0)
  const remove = async () => {
    if (!removeTarget) return
    try { await api.expenses.remove(removeTarget._id); notify('Expense deleted. Balances are updated.'); setActive(null); await load() }
    catch (error) { notify(errorMessage(error), 'error') }
    finally { setRemoveTarget(null) }
  }

  if (loading && !trip) return <LoadingState label="Gathering the trip expenses" />
  if (failure && !trip) return <div className="page-wrap"><ErrorState message={failure} retry={() => setRetry((value) => value + 1)} /></div>
  if (!trip) return null
  return <div className="expenses-page page-enter"><div className="page-topline"><Link to={`/trips/${tripId}`} className="back-link"><ArrowLeft size={18} /> Trip</Link><span className="page-top-kicker">THE SHARED TAB</span><button className="icon-button" aria-label="Sort expenses" onClick={() => setExpenses((items) => [...items].reverse())}><ArrowDownUp size={18} /></button></div>
    <header className="page-heading expense-heading"><span className="eyebrow">EVERY LITTLE THING ADDS UP</span><h1>Expenses</h1><p>{formatMoney(total, trip.currency)} <span>across {visible.length} {visible.length === 1 ? 'expense' : 'expenses'}</span></p></header>
    <div className="expense-tools"><div className="filter-chips" role="tablist" aria-label="Expense category">{filterOptions.map(([value, label]) => <button key={value} className={category === value ? 'active' : ''} role="tab" aria-selected={category === value} onClick={() => setCategory(value ?? 'all')}>{label}</button>)}</div><label className="expense-search"><Filter size={16} /><input placeholder="Search expenses" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
    {failure ? <ErrorState message={failure} retry={() => setRetry((value) => value + 1)} /> : loading ? <LoadingState label="Adding up the little things" /> : visible.length ? <div className="expense-list">{visible.map((expense) => <ExpenseRow key={expense._id} expense={expense} trip={trip} onClick={() => setActive(expense)} />)}</div> : <EmptyState title="No expenses just yet" detail="Add the first shared expense and everyone can see their part." action={<Link className="button button-primary" to={`/trips/${tripId}/expenses/new`}><Plus size={17} />Add Expense</Link>} />}
    <Link className="button button-primary button-wide expense-bottom-add" to={`/trips/${tripId}/expenses/new`}><Plus size={19} />Add Expense</Link>
    {active && <ExpenseDrawer expense={active} trip={trip} travelers={travelers} currentUser={user?.id ?? ''} onClose={() => setActive(null)} onEdit={() => navigate(`/trips/${tripId}/expenses/${active._id}/edit`)} onDelete={() => setRemoveTarget(active)} />}
    {removeTarget && <ConfirmDialog title="Delete this expense?" message="The expense will be removed and suggested settlements will be recalculated." confirmLabel="Delete expense" onClose={() => setRemoveTarget(null)} onConfirm={() => void remove()} />}
  </div>
}

function ExpenseRow({ expense, trip, onClick }: { expense: Expense; trip: Trip; onClick: () => void }) {
  const Icon = expense.category === 'food' ? Utensils : expense.category === 'stay' ? BedDouble : expense.category === 'transport' ? Wallet : expense.category === 'activities' ? Ticket : expense.category === 'shopping' ? ShoppingBag : Sparkles
  const offset = Math.floor((new Date(expense.date).getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1
  return <button className="expense-row surface" onClick={onClick}><span className={`expense-category-icon category-${expense.category}`}><Icon size={20} /></span><span className="expense-row-copy"><strong>{expense.description}</strong><small>Day {Math.max(1, Math.min(inclusiveDays(trip.startDate, trip.endDate), offset))} <span>•</span> {formatDate(expense.date, { day: 'numeric', month: 'short' })}</small><small>Paid by {expense.paidBy?.name ?? 'Traveler'}</small></span><span className="expense-row-money"><strong>{formatMoney(expense.amountInTripCurrency, trip.currency)}</strong><span className="avatar-stack">{expense.participants.slice(0, 3).map((person) => <Avatar user={person} size="sm" ring key={person.id} />)}</span></span></button>
}

function ExpenseDrawer({ expense, trip, travelers, currentUser, onClose, onEdit, onDelete }: { expense: Expense; trip: Trip; travelers: Traveler[]; currentUser: string; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const creatorId = typeof expense.createdBy === 'object' ? expense.createdBy.id : expense.createdBy
  const authorCanEdit = travelers.some((person) => person.user.id === currentUser && (person.role === 'organizer' || person.user.id === creatorId))
  return <div className="drawer-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="expense-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><button className="icon-button dialog-close" aria-label="Close expense details" onClick={onClose}><X size={18} /></button><span className="eyebrow">SHARED EXPENSE</span><h2 id="drawer-title">{expense.description}</h2><strong className="drawer-total">{formatMoney(expense.amountInTripCurrency, trip.currency)}</strong><p className="drawer-meta">Paid by {expense.paidBy?.name ?? 'Traveler'} on {formatDate(expense.date)}</p><div className="drawer-breakdown"><h3>Split details</h3>{expense.computedShares.map((share, index) => { const shareId = typeof share.user === 'string' ? share.user : share.user.id; const person = travelers.find((item) => item.user.id === shareId)?.user ?? (typeof share.user === 'object' ? share.user : undefined); return <div className="breakdown-row" key={`${shareId}-${index}`}><Avatar user={person} size="sm" /><span>{person?.name ?? 'Traveler'}</span><strong>{formatMoney(share.amount, trip.currency)}</strong></div> })}</div>{authorCanEdit && <div className="drawer-actions"><button className="button button-secondary" onClick={onEdit}><Pencil size={16} />Edit</button><button className="button button-danger" onClick={onDelete}><Trash2 size={16} />Delete</button></div>}</section></div>
}

export function ExpenseFormPage() {
  const { tripId = '', expenseId } = useParams()
  const editing = Boolean(expenseId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notify } = useToast()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [travelers, setTravelers] = useState<Traveler[]>([])
  const [tab, setTab] = useState<'basic' | 'split'>('basic')
  const [ready, setReady] = useState(false)
  const [failure, setFailure] = useState('')
  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = useForm<ExpenseFormValues>({ resolver: zodResolver(expenseSchema), defaultValues: { description: '', amount: 0, currency: 'INR', exchangeRate: 1, category: 'food', paidBy: '', date: new Date().toISOString().slice(0, 10), splitType: 'equal', participants: [], values: {} } })
  const values = useWatch({ control })
  const currency = values.currency ?? trip?.currency ?? 'INR'

  useEffect(() => {
    let active = true
    Promise.all([api.trips.get(tripId), api.travelers.list(tripId), editing ? api.expenses.get(expenseId ?? '') : Promise.resolve(null)]).then(([details, people, expense]) => {
      if (!active) return
      setTrip(details.trip); setTravelers(people)
      if (expense) {
        setValue('description', expense.description); setValue('amount', expense.amount / (10 ** new Intl.NumberFormat('en', { style: 'currency', currency: expense.currency }).resolvedOptions().maximumFractionDigits))
        setValue('currency', expense.currency); setValue('exchangeRate', expense.exchangeRate ?? 1); setValue('category', expense.category); setValue('paidBy', typeof expense.paidBy === 'object' ? expense.paidBy.id : expense.paidBy)
        setValue('date', expense.date.slice(0, 10)); setValue('splitType', expense.splitType === 'custom' ? 'percentage' : expense.splitType)
        const selected = expense.participants.map((person) => typeof person === 'object' ? person.id : person)
        setValue('participants', selected)
        const tripMinorFactor = 10 ** new Intl.NumberFormat('en', { style: 'currency', currency: details.trip.currency }).resolvedOptions().maximumFractionDigits
        const savedSplits = expense.customSplits.map((split) => ({
          user: typeof split.user === 'object' ? split.user.id : split.user,
          value: split.value,
        }))
        const legacyPercentages = expense.splitType === 'custom' ? percentagesFromWeights(savedSplits) : null
        setValue('values', Object.fromEntries(savedSplits.map(({ user: id, value }) => {
          const convertedValue = legacyPercentages?.[id] ?? (expense.splitType === 'percentage' ? value / 100 : expense.splitType === 'exact' ? value / tripMinorFactor : value)
          return [id, convertedValue]
        })))
      } else {
        setValue('currency', details.trip.currency)
        setValue('paidBy', user?.id ?? people[0]?.user.id ?? '')
        setValue('participants', people.map((person) => person.user.id))
      }
      setReady(true)
    }).catch((error: unknown) => { if (active) setFailure(errorMessage(error)) })
    return () => { active = false }
  }, [tripId, expenseId, editing, setValue, user?.id])

  const selectedIds = values.participants ?? []
  const splitType = values.splitType ?? 'equal'
  const amountMajor = Number(values.amount ?? 0)
  const toPreviewMinor = (major: number) => toMinorUnits(major, trip?.currency ?? 'INR')
  const foreign = Boolean(currency && trip && currency !== trip.currency)
  const previewAmount = trip ? foreign
    ? Math.round(toMinorUnits(amountMajor, currency) * Number(values.exchangeRate ?? 1))
    : toMinorUnits(amountMajor, trip.currency)
    : toPreviewMinor(amountMajor)
  const percentageBasisPoints = selectedIds.reduce((sum, id) => {
    const value = values.values?.[id]
    return sum + (typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) : 0)
  }, 0)
  const percentageTotal = percentageBasisPoints / 100
  const percentageShares = splitType === 'percentage' && percentageBasisPoints === 10000
    ? sharesFromPercentages(previewAmount, selectedIds.map((user) => ({ user, basisPoints: Math.round(Number(values.values?.[user] ?? 0) * 100) })))
    : null
  const previewShares = travelers.filter((person) => selectedIds.includes(person.user.id)).map((person) => {
    const rawValue = values.values?.[person.user.id]
    const raw = typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : 0
    let amount = 0
    if (splitType === 'equal') amount = Math.floor(previewAmount / Math.max(1, selectedIds.length))
    else if (splitType === 'exact') amount = toPreviewMinor(raw)
    else if (splitType === 'percentage') amount = percentageShares?.[person.user.id] ?? Math.round(previewAmount * raw / 100)
    else amount = Math.round(previewAmount * raw / Math.max(1, selectedIds.reduce((sum, id) => sum + Number(values.values?.[id] ?? 0), 0)))
    return { person, amount }
  })
  const assigned = previewShares.reduce((sum, share) => sum + share.amount, 0)
  const percentagePrecisionInvalid = selectedIds.some((id) => {
    const value = values.values?.[id]
    return typeof value === 'number' && Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) > 1e-7
  })

  const submit = async (form: ExpenseFormValues) => {
    if (!trip) return
    try {
      const amountMinor = toMinorUnits(form.amount, form.currency)
      const customSplits = form.participants.map((id) => ({ user: id, value: form.splitType === 'percentage' ? Math.round(Number(form.values[id] ?? 0) * 100) : form.splitType === 'exact' ? toMinorUnits(Number(form.values[id] ?? 0), trip.currency) : Number(form.values[id] ?? 0) }))
      const payload = { description: form.description, amount: amountMinor, currency: form.currency, exchangeRate: foreign ? form.exchangeRate : 1, category: form.category, paidBy: form.paidBy, date: `${form.date}T00:00:00.000Z`, splitType: form.splitType, participants: form.participants, customSplits }
      if (editing) await api.expenses.update(expenseId ?? '', payload)
      else await api.expenses.create(tripId, payload)
      notify(editing ? 'Expense updated. Balances are refreshed.' : 'Expense added successfully! 💜')
      navigate(`/trips/${tripId}/expenses`)
    } catch (error) { notify(errorMessage(error), 'error') }
  }

  if (!ready && !failure) return <LoadingState label="Preparing the shared tab" />
  if (failure) return <div className="page-wrap"><ErrorState message={failure} retry={() => window.location.reload()} /></div>
  if (!trip) return null
  return <div className="expense-form-page page-enter"><div className="page-topline"><Link to={`/trips/${tripId}/expenses`} className="back-link"><ArrowLeft size={18} /> Expenses</Link><span className="page-top-kicker">{trip.name}</span></div><header className="page-heading"><span className="eyebrow">EVERYONE'S IN ON IT</span><h1>{editing ? 'Edit Expense' : 'Add Expense'}</h1><p>Make the math feel like the easy part.</p></header>
    <form className="expense-form surface" onSubmit={handleSubmit(submit)} noValidate><div className="segment-tabs" role="tablist"><button type="button" role="tab" aria-selected={tab === 'basic'} className={tab === 'basic' ? 'active' : ''} onClick={() => setTab('basic')}>Basic</button><button type="button" role="tab" aria-selected={tab === 'split'} className={tab === 'split' ? 'active' : ''} onClick={() => setTab('split')}>Split details</button></div>
      {tab === 'basic' ? <div className="form-stack"><label className="field"><span>Description</span><input placeholder="Dinner at La Plancha" {...register('description')} />{errors.description && <small>{errors.description.message}</small>}</label><div className="field-row"><label className="field"><span>Amount</span><input type="number" min="0.01" step="0.01" placeholder="0.00" {...register('amount', { valueAsNumber: true })} />{errors.amount && <small>{errors.amount.message}</small>}</label><label className="field"><span>Currency</span><select {...register('currency')}>{currencyOptions.map((option) => <option value={option.code} key={option.code}>{option.code} ({option.symbol})</option>)}</select></label></div>{foreign && <label className="field"><span>Exchange rate <em>1 {currency} in {trip.currency}</em></span><input type="number" min="0.000001" step="any" {...register('exchangeRate', { valueAsNumber: true })} />{errors.exchangeRate && <small>{errors.exchangeRate.message}</small>}</label>}
        <label className="field"><span>Category</span><select {...register('category')}><option value="food">Food & Drinks</option><option value="stay">Stay</option><option value="transport">Transport</option><option value="activities">Activities</option><option value="shopping">Shopping</option><option value="other">Other</option></select></label><div className="field-row"><label className="field"><span>Paid by</span><select {...register('paidBy')}>{travelers.map((person) => <option value={person.user.id} key={person._id}>{person.user.name}{person.user.id === user?.id ? ' (You)' : ''}</option>)}</select>{errors.paidBy && <small>{errors.paidBy.message}</small>}</label><label className="field"><span>Date</span><span className="input-wrap"><CalendarDays size={17} /><input type="date" {...register('date')} /></span></label></div>
        <div className="field"><div className="split-list-heading"><span>Split Among</span><button type="button" className="text-button" onClick={() => setValue('participants', selectedIds.length === travelers.length ? [] : travelers.map((person) => person.user.id))}>{selectedIds.length === travelers.length ? 'Deselect all' : 'Select all'}</button></div><div className="participants-list">{travelers.map((person) => <label className="participant-row" key={person._id}><Avatar user={person.user} size="sm" /><span>{person.user.name}{person.user.id === user?.id ? ' (You)' : ''}</span><input type="checkbox" checked={selectedIds.includes(person.user.id)} onChange={(event) => setValue('participants', event.target.checked ? [...selectedIds, person.user.id] : selectedIds.filter((id) => id !== person.user.id), { shouldValidate: true })} /></label>)}</div>{errors.participants && <small>{errors.participants.message}</small>}</div>
      </div> :             <div className="form-stack"><span className="field-label">How shall we split it?</span><div className="split-mode-tabs">{(['equal', 'percentage', 'exact'] as const).map((mode) => <button type="button" key={mode} className={splitType === mode ? 'active' : ''} onClick={() => setValue('splitType', mode)}>{mode === 'exact' ? 'Exact' : mode === 'percentage' ? 'Custom (%)' : 'Equal'}</button>)}</div>{splitType !== 'equal' && <div className="split-value-list">{travelers.filter((person) => selectedIds.includes(person.user.id)).map((person) => <label className="split-value-row" key={person._id}><Avatar user={person.user} size="sm" /><span>{person.user.name}</span><span className="split-value-input"><input aria-label={`${splitType === 'percentage' ? 'Custom percentage' : 'Exact'} value for ${person.user.name}`} type="number" min="0" max={splitType === 'percentage' ? 100 : undefined} step="0.01" {...register(`values.${person.user.id}`, { valueAsNumber: true })} /><small>{splitType === 'percentage' ? '%' : trip.currency}</small></span></label>)}</div>}
        <div className={`split-total${splitType === 'percentage' ? percentageBasisPoints === 10000 ? ' balanced' : '' : assigned === previewAmount ? ' balanced' : ''}`}><span>{splitType === 'percentage' ? 'Custom split · total must be 100%' : splitType === 'equal' ? 'Shared equally' : 'Assigned so far'}</span><strong>{splitType === 'percentage' ? `${percentageTotal.toFixed(2)}%` : `${formatMoney(assigned, trip.currency)} ${assigned === previewAmount ? '· all assigned' : `· ${formatMoney(previewAmount - assigned, trip.currency)} left`}`}</strong></div>
        {splitType === 'percentage' && <small role={percentageTotal !== 100 || percentagePrecisionInvalid ? 'alert' : undefined}>{percentagePrecisionInvalid ? 'Use no more than two decimal places for each percentage.' : percentageTotal !== 100 ? 'Custom percentages must add up to exactly 100%.' : 'Percentages can use up to two decimal places each.'}</small>}
        <div className="live-preview"><div><span className="eyebrow">LIVE PREVIEW</span><span className="preview-hint">Final shares are confirmed by the trip ledger.</span></div>{previewShares.map(({ person, amount }) => <div className="preview-row" key={person._id}><Avatar user={person.user} size="sm" /><span>{person.user.name}</span><strong>{formatMoney(amount, trip.currency)}</strong></div>)}</div>
      </div>}
      <div className="expense-form-actions">{tab === 'basic' ? <button type="button" className="button button-secondary" onClick={() => setTab('split')}>Split Details <ChevronDown size={16} /></button> : <button type="button" className="button button-secondary" onClick={() => setTab('basic')}><ArrowLeft size={16} />Basic details</button>}<button className="button button-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : editing ? 'Save Expense' : 'Save Expense'}<Check size={17} /></button></div>
    </form>
  </div>
}