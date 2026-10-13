import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Heart, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Logo } from '../components/layout/Logo'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { errorMessage } from '../api/http'
import { authFormSchema } from '../utils/authValidation'

type FormValues = z.infer<ReturnType<typeof authFormSchema>>

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register, loading } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { register: field, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(authFormSchema(mode)), defaultValues: { email: '', password: '' } })
  if (!loading && user) return <Navigate to="/dashboard" replace />

  const submit = async (values: FormValues) => {
    try {
      if (mode === 'login') await login(values.email, values.password)
      else await register(values.name ?? '', values.email, values.password)
      notify(mode === 'login' ? 'Welcome back, traveler!' : 'Your travel journal is ready!')
      const destination = (location.state as { from?: string } | null)?.from ?? '/dashboard'
      navigate(destination, { replace: true })
    } catch (error) { notify(errorMessage(error), 'error') }
  }

  return <main className="auth-page"><div className="auth-art" aria-hidden="true" /><div className="auth-top"><Link to="/" className="back-link"><ArrowLeft size={17} /> Back</Link><Logo /></div>
    <section className="auth-card"><span className="auth-heart"><Heart size={19} fill="currentColor" /></span><p className="eyebrow">A GOOD TRIP STARTS HERE</p><h1>{mode === 'login' ? 'Welcome back' : 'Join the journey'}</h1><p className="auth-subtitle">{mode === 'login' ? 'Your next adventure is waiting.' : 'Make room for more memories together.'}</p>
      <form onSubmit={handleSubmit(submit)} noValidate>
        {mode === 'register' && <label className="field"><span>Your name</span><span className="input-wrap"><UserRound size={17} /><input autoComplete="name" placeholder="Ganavi" {...field('name')} /></span>{errors.name && <small>{errors.name.message}</small>}</label>}
        <label className="field"><span>Email address</span><span className="input-wrap"><Mail size={17} /><input type="email" autoComplete="email" placeholder="you@example.com" {...field('email')} /></span>{errors.email && <small>{errors.email.message}</small>}</label>
        <label className="field"><span>Password</span><span className="input-wrap"><LockKeyhole size={17} /><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" {...field('password')} /></span>{errors.password && <small>{errors.password.message}</small>}</label>
        <button type="submit" className="button button-primary button-wide" disabled={isSubmitting}>{isSubmitting ? 'One moment…' : mode === 'login' ? 'Login' : 'Create account'}<Heart size={16} /></button>
      </form>
      <p className="auth-switch">{mode === 'login' ? 'New around here?' : 'Already part of the journey?'} <Link to={mode === 'login' ? '/register' : '/login'}>{mode === 'login' ? 'Create an account' : 'Login'}</Link></p>
    </section>
    <p className="auth-footer">Plan Together <span>•</span> Spend Together <span>•</span> Travel Better</p>
  </main>
}