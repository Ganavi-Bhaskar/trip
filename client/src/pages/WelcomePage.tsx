import { ArrowRight, Heart, MapPin, Sparkles } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { Logo } from '../components/layout/Logo'
import { useAuth } from '../context/AuthContext'

export function WelcomePage() {
  const { user, loading } = useAuth()
  if (loading) return <div className="welcome-loading" />
  if (user) return <Navigate to="/dashboard" replace />
  return <main className="welcome-page">
    <div className="welcome-art" aria-hidden="true" />
    <header className="welcome-top"><div className="cloud-brand"><Logo /><span>Travel Together, Split Smarter <Heart size={13} fill="currentColor" /></span></div><p className="desktop-script">Good Friends,<br />Great Journeys</p><p className="brush-note">Same people, new places,<br />happier us <Heart size={14} fill="currentColor" /></p></header>
    <section className="welcome-content"><span className="eyebrow"><MapPin size={14} /> YOUR TRAVEL JOURNAL</span><h1>Plan Together<br /><em>Spend Together</em></h1><p>Travel better with the people who make every place feel like home.</p><div className="welcome-actions"><Link className="button button-primary" to="/register">Get Started <ArrowRight size={17} /></Link><Link className="button button-secondary" to="/login">Login</Link></div><span className="welcome-script">Good trips are better together <Heart size={15} fill="currentColor" /></span></section>
    <div className="welcome-features"><span><CompassIcon />Plan amazing itineraries</span><span><Sparkles size={18} />Split expenses easily</span><span><Heart size={18} />Make memories</span><p>Collect moments, not things!</p></div>
  </main>
}

function CompassIcon() { return <MapPin size={18} /> }