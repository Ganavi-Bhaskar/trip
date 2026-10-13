import { useState } from 'react'
import { useLocation, useNavigate, useParams, Outlet, Link } from 'react-router-dom'
import { BookOpen, Camera, ChevronDown, CircleDollarSign, Compass, Home, Menu, Plus, Settings, Users, Wallet, X } from 'lucide-react'
import { Logo } from './Logo'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'

export function AppShell() {
  const { tripId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [quickOpen, setQuickOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const isActive = (path: string) => location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path))
  const tripPath = (suffix = '') => tripId ? `/trips/${tripId}${suffix}` : '/dashboard'
  const links = [
    { title: 'Overview', path: tripPath(), icon: Home },
    { title: 'Itinerary', path: tripPath('/itinerary'), icon: BookOpen },
    { title: 'Expenses', path: tripPath('/expenses'), icon: Wallet },
    { title: 'Travelers', path: tripPath('/travelers'), icon: Users },
    { title: 'Photos', path: tripPath('/photos'), icon: Camera },
    { title: 'Balances', path: tripPath('/balances'), icon: CircleDollarSign },
  ]
  const navigateQuick = (path: string) => { setQuickOpen(false); navigate(path) }

  return <div className="app-frame">
    <aside className={`side-rail${mobileMenu ? ' side-rail-open' : ''}`}>
      <div className="rail-top"><Logo /><button className="icon-button rail-close" aria-label="Close menu" onClick={() => setMobileMenu(false)}><X size={18} /></button></div>
      <div className="rail-trip-label">YOUR JOURNAL</div>
      <nav className="rail-nav" aria-label="Trip navigation">
        <Link className={`rail-link${isActive('/dashboard') && !tripId ? ' active' : ''}`} to="/dashboard"><Compass size={18} />All trips</Link>
        {tripId && links.map(({ title, path, icon: Icon }) => <Link className={`rail-link${isActive(path) ? ' active' : ''}`} to={path} key={title}><Icon size={18} />{title}</Link>)}
      </nav>
      <div className="rail-spacer" />
      <Link className={`rail-link${isActive('/settings') ? ' active' : ''}`} to="/settings"><Settings size={18} />Settings</Link>
      <div className="rail-user"><Avatar user={user} size="sm" /><span className="rail-user-name">{user?.name ?? 'Traveler'}</span><button className="icon-button rail-logout" aria-label="Log out" onClick={() => { logout(); navigate('/') }}><ChevronDown size={17} /></button></div>
    </aside>

    {mobileMenu && <button className="rail-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
    <div className="app-column">
      <header className="topbar">
        <button className="icon-button mobile-menu-button" aria-label="Open menu" onClick={() => setMobileMenu(true)}><Menu size={20} /></button>
        <div className="topbar-brand"><Logo compact /></div>
        <div className="topbar-crumb">{tripId ? <><span>My trips</span><span className="crumb-dot">/</span><strong>{links.find((link) => isActive(link.path))?.title ?? 'Trip'}</strong></> : <strong>Travel, together</strong>}</div>
        <button className="profile-button" onClick={() => navigate('/settings')}><Avatar user={user} size="sm" /><span>{user?.name?.split(' ')[0] ?? 'Traveler'}</span></button>
      </header>
      <main className="app-main"><Outlet /></main>
      {tripId && <nav className="bottom-nav" aria-label="Primary navigation">
        <Link to={tripPath()} className={isActive(tripPath()) ? 'selected' : ''}><Home size={20} /><span>Home</span></Link>
        <Link to={tripPath('/itinerary')} className={isActive(tripPath('/itinerary')) ? 'selected' : ''}><BookOpen size={20} /><span>Plan</span></Link>
        <button className="nav-add" aria-label="Quick add" onClick={() => setQuickOpen(true)}><Plus size={24} /></button>
        <Link to={tripPath('/expenses')} className={isActive(tripPath('/expenses')) ? 'selected' : ''}><Wallet size={20} /><span>Spend</span></Link>
        <button className={moreOpen ? 'selected' : ''} onClick={() => setMoreOpen(true)}><Menu size={20} /><span>More</span></button>
      </nav>}
    </div>
    {quickOpen && <div className="sheet-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuickOpen(false) }}><section className="action-sheet"><div className="sheet-handle" /><h2>Make a little plan</h2><div className="quick-actions"><button onClick={() => navigateQuick(tripPath('/itinerary?add=1'))}><BookOpen />Add activity</button><button onClick={() => navigateQuick(tripPath('/expenses/new'))}><Wallet />Add expense</button><button onClick={() => navigateQuick(tripPath('/photos?add=1'))}><Camera />Add photo</button><button onClick={() => navigateQuick(tripPath('/travelers?add=1'))}><Users />Add traveler</button></div></section></div>}
    {moreOpen && <div className="sheet-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setMoreOpen(false) }}><section className="action-sheet"><div className="sheet-handle" /><h2>A little more</h2><div className="more-links">{[['Travelers', tripPath('/travelers')], ['Photos', tripPath('/photos')], ['Balances', tripPath('/balances')], ['Settings', '/settings']].map(([label, path]) => <button key={label} onClick={() => { setMoreOpen(false); navigate(path ?? '/settings') }}>{label}<ChevronDown size={17} /></button>)}<button className="logout-row" onClick={() => { setMoreOpen(false); logout(); navigate('/') }}>Log out</button></div></section></div>}
  </div>
}