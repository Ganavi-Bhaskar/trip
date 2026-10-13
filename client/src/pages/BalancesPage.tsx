import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, ChevronUp, CircleCheck, CircleDollarSign, HandCoins, Palmtree, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/resources'
import { errorMessage } from '../api/http'
import { Avatar } from '../components/ui/Avatar'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { useToast } from '../context/ToastContext'
import type { Balance, Trip } from '../types/models'
import { formatMoney } from '../utils/money'

export function BalancesPage() {
  const { tripId = '' } = useParams()
  const { notify } = useToast()
  const [balance, setBalance] = useState<Balance | null>(null)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selected, setSelected] = useState<Balance['settlements'][number] | null>(null)
  const [working, setWorking] = useState(false)
  const [failure, setFailure] = useState('')
  const [retry, setRetry] = useState(0)

  const load = async () => {
    try {
      const [currentBalance, details, settlements] = await Promise.all([api.balance.get(tripId), api.trips.get(tripId), api.balance.settlements(tripId)])
      setBalance({ ...currentBalance, settlements }); setTrip(details.trip); setFailure('')
    } catch (error) { setFailure(errorMessage(error)) }
  }
  useEffect(() => { void load() }, [tripId, retry])
  const pending = balance?.settlements.filter((item) => item.status === 'pending') ?? []
  const settled = balance?.settlements.filter((item) => item.status === 'settled') ?? []

  const markSettled = async () => {
    if (!selected) return
    setWorking(true)
    try { await api.balance.settle(selected.id || selected._id); notify('Settlement marked as complete! 🎉'); await load() }
    catch (error) { notify(errorMessage(error), 'error') }
    finally { setWorking(false); setSelected(null) }
  }

  if (!balance && !failure) return <LoadingState label="Balancing the shared tab" />
  if (failure) return <div className="page-wrap"><ErrorState message={failure} retry={() => setRetry((value) => value + 1)} /></div>
  if (!balance || !trip) return null
  return <div className="balances-page page-enter"><div className="page-topline"><Link to={`/trips/${tripId}`} className="back-link"><ArrowLeft size={18} /> Trip</Link><span className="page-top-kicker">FAIR AND SQUARE</span></div><header className="page-heading"><span className="eyebrow">THE NUMBERS, NICELY DONE</span><h1>Balance Summary</h1><p>Clear tabs, fuller hearts.</p></header>
    <section className="balance-total-card"><div><span className="eyebrow">TOTAL TRIP EXPENSES</span><strong>{formatMoney(balance.totalExpenses, balance.currency)}</strong><span>Shared across {balance.balances.length} travelers</span></div><div className="balance-illustration"><Palmtree size={57} strokeWidth={1.3} /><Sparkles size={19} /></div></section>
    <section className="balance-section"><div className="section-heading"><div><h2>Individual Balances</h2><p>Everyone's share, all caught up.</p></div><span className="balance-sparkle">✦</span></div><div className="balance-list surface">{balance.balances.map((item) => <div className="balance-person" key={item.user.id}><Avatar user={item.user} size="md" /><div className="balance-person-name"><strong>{item.user.name}</strong><span>{item.status === 'gets back' ? 'gets back' : item.status === 'owes' ? 'owes' : 'all settled'}</span></div><strong className={`balance-amount ${item.net > 0 ? 'positive' : item.net < 0 ? 'negative' : 'zero'}`}>{item.net === 0 ? 'Settled' : `${item.net > 0 ? '+' : '−'} ${formatMoney(Math.abs(item.net), balance.currency)}`}</strong></div>)}</div></section>
    <section className="balance-section settlement-section"><div className="section-heading"><div><h2>Suggested Settlement</h2><p>A few simple steps to square up.</p></div><HandCoins size={22} /></div>{pending.length ? <div className="settlement-list">{pending.map((settlement) => <article className="settlement-row surface" key={settlement._id}><div className="settlement-people"><span className="settlement-avatars"><Avatar user={settlement.from} size="sm" ring /><Avatar user={settlement.to} size="sm" ring /></span><span><strong>{settlement.from.name} <i>→</i> {settlement.to.name}</strong><small>{settlement.from.name} pays {settlement.to.name}</small></span></div><div className="settlement-end"><strong>{formatMoney(settlement.amount, balance.currency)}</strong><button className="mark-settled-button" onClick={() => setSelected(settlement)}><Check size={15} />Mark settled</button></div></article>)}</div> : <EmptyState title="All settled up!" detail="Nothing left between friends but the next adventure." action={<CircleCheck className="settled-check" size={27} />} />}</section>
    {pending.length > 0 && <button className="button button-primary button-wide settle-all-button" onClick={() => setSelected(pending[0] ?? null)}><CircleDollarSign size={19} />Mark as Settled</button>}
    {settled.length > 0 && <section className="settled-history"><button className="history-toggle" aria-expanded={historyOpen} onClick={() => setHistoryOpen((open) => !open)}><span>Settled history <small>{settled.length} complete</small></span>{historyOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>{historyOpen && <div className="history-list">{settled.map((item) => <div key={item._id} className="history-row"><span><CircleCheck size={17} />{item.from.name} paid {item.to.name}</span><strong>{formatMoney(item.amount, balance.currency)}</strong></div>)}</div>}</section>}
    {selected && <ConfirmDialog title="Mark this settled?" message={`${selected.from.name} will pay ${formatMoney(selected.amount, balance.currency)} to ${selected.to.name}. This updates everyone's trip balance.`} confirmLabel="Confirm settlement" busy={working} onClose={() => setSelected(null)} onConfirm={() => void markSettled()} />}
  </div>
}