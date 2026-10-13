import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, Camera, Check, KeyRound, LogOut, Trash2, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api/resources'
import { errorMessage } from '../api/http'
import { Avatar } from '../components/ui/Avatar'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { currencyOptions } from '../utils/currencyOptions'
import type { ThemeMode } from '../utils/theme'

const profileSchema = z.object({ name: z.string().trim().min(1, 'Please enter your name.'), currency: z.string().length(3), notifications: z.boolean() })
const passwordSchema = z.object({ currentPassword: z.string().min(1, 'Enter your current password.'), newPassword: z.string().min(8, 'Use at least 8 characters.').regex(/[A-Za-z]/, 'Add a letter.').regex(/[0-9]/, 'Add a number.'), confirmPassword: z.string() }).refine((value) => value.newPassword === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' })
type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export function SettingsPage() {
  const { user, setUser, logout } = useAuth()
  const { notify } = useToast()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  // Separate local state for the selected theme in the form — initialized from context
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(theme)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', currency: user?.preferences.currency ?? 'INR', notifications: user?.preferences.notifications ?? true }
  })
  const { register: passwordField, handleSubmit: handlePassword, reset: resetPassword, formState: { errors: passwordErrors, isSubmitting: passwordBusy } } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    if (user) reset({ name: user.name, currency: user.preferences.currency, notifications: user.preferences.notifications })
  }, [user, reset])

  // Keep local selectedTheme in sync if theme context changes externally (e.g. system preference change)
  useEffect(() => { setSelectedTheme(theme) }, [theme])

  const handleThemeChange = (value: ThemeMode) => {
    setSelectedTheme(value)
    setTheme(value) // Apply immediately for live preview
  }

  const saveProfile = async (values: ProfileValues) => {
    try {
      const updated = await api.users.update({ name: values.name, preferences: { currency: values.currency, notifications: values.notifications, theme: selectedTheme } })
      setUser(updated)
      notify('Your preferences are saved.')
    } catch (error) { notify(errorMessage(error), 'error') }
  }
  const changePassword = async (values: PasswordValues) => {
    try { await api.users.password({ currentPassword: values.currentPassword, newPassword: values.newPassword }); resetPassword(); notify('Password updated.') }
    catch (error) { notify(errorMessage(error), 'error') }
  }
  const uploadAvatar = async (file?: File) => {
    if (!file) return
    setAvatarBusy(true)
    try { const avatar = await api.upload('avatar', file); const updated = await api.users.update({ avatar }); setUser(updated); notify('Profile photo updated.') }
    catch (error) { notify(errorMessage(error), 'error') }
    finally { setAvatarBusy(false) }
  }
  const deleteAccount = async () => {
    setDeleting(true)
    try { await api.users.remove(deletePassword); logout(); notify('Your account has been deleted.'); navigate('/') }
    catch (error) { notify(errorMessage(error), 'error') }
    finally { setDeleting(false) }
  }

  return <div className="settings-page page-enter"><div className="page-topline"><Link to="/dashboard" className="back-link">&#x2039; &nbsp;Your trips</Link><span className="page-top-kicker">MAKE IT YOURS</span></div><header className="page-heading"><span className="eyebrow">YOUR LITTLE CORNER</span><h1>Settings</h1><p>Keep your account feeling like you.</p></header>
    <section className="settings-section surface"><div className="settings-section-title"><span className="settings-icon"><UserRound size={19} /></span><div><h2>Your profile</h2><p>The name your friends see.</p></div></div><div className="profile-photo-row"><Avatar user={user} size="lg" /><div><strong>{user?.name}</strong><span>{user?.email}</span></div><label className="button button-secondary avatar-upload-button"><Camera size={16} />{avatarBusy ? 'Uploading…' : 'Change photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadAvatar(event.target.files?.[0])} /></label></div>
      <form className="settings-form" onSubmit={handleSubmit(saveProfile)} noValidate><label className="field"><span>Name</span><input {...register('name')} />{errors.name && <small>{errors.name.message}</small>}</label><label className="field"><span>Email address</span><input value={user?.email ?? ''} readOnly /></label><div className="field-row"><label className="field"><span>Default currency</span><select {...register('currency')}>{currencyOptions.map((option) => <option value={option.code} key={option.code}>{option.code} ({option.symbol})</option>)}</select></label><label className="field"><span>Appearance</span><select id="theme-select" value={selectedTheme} onChange={(event) => handleThemeChange(event.target.value as ThemeMode)}><option value="system">System default</option><option value="light">Light</option><option value="dark">Dark</option></select></label></div><label className="toggle-row"><span className="toggle-icon"><Bell size={17} /></span><span><strong>Trip notifications</strong><small>Get updates about shared plans.</small></span><input type="checkbox" {...register('notifications')} /></label><button className="button button-primary settings-save" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save preferences'}<Check size={17} /></button></form>
    </section>
    <section className="settings-section surface"><div className="settings-section-title"><span className="settings-icon"><KeyRound size={19} /></span><div><h2>Change password</h2><p>Keep your account in good hands.</p></div></div><form className="settings-form" onSubmit={handlePassword(changePassword)} noValidate><label className="field"><span>Current password</span><input type="password" autoComplete="current-password" {...passwordField('currentPassword')} />{passwordErrors.currentPassword && <small>{passwordErrors.currentPassword.message}</small>}</label><div className="field-row"><label className="field"><span>New password</span><input type="password" autoComplete="new-password" {...passwordField('newPassword')} />{passwordErrors.newPassword && <small>{passwordErrors.newPassword.message}</small>}</label><label className="field"><span>Confirm password</span><input type="password" autoComplete="new-password" {...passwordField('confirmPassword')} />{passwordErrors.confirmPassword && <small>{passwordErrors.confirmPassword.message}</small>}</label></div><button className="button button-secondary settings-save" disabled={passwordBusy}>{passwordBusy ? 'Updating…' : 'Update password'}</button></form></section>
    <section className="account-actions"><button className="button button-secondary" onClick={() => { logout(); navigate('/') }}><LogOut size={17} />Log out</button><button className="text-danger" onClick={() => setDeleteOpen(true)}><Trash2 size={16} />Delete account</button></section>
    {deleteOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteOpen(false) }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-account-title"><button className="icon-button dialog-close" aria-label="Close" onClick={() => setDeleteOpen(false)}><X size={18} /></button><span className="dialog-mark">!</span><h2 id="delete-account-title">Delete your account?</h2><p>This cannot be undone. Trips where you are the only organizer with other travelers must be transferred first.</p><label className="field"><span>Confirm with your password</span><input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} /></label><button className="button button-danger button-wide" disabled={!deletePassword || deleting} onClick={() => void deleteAccount()}>{deleting ? 'Deleting…' : 'Delete account'}</button></section></div>}
  </div>
}