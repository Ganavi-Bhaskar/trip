import { Compass, MoveLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <main className="not-found"><span className="not-found-art"><Compass size={44} /></span><p className="eyebrow">A WRONG TURN, MAYBE?</p><h1>This page wandered off.</h1><p>Let's get you back to the good part of the journey.</p><Link className="button button-primary" to="/dashboard"><MoveLeft size={17} />Back to your trips</Link></main>
}