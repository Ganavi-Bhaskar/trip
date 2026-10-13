import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowLeftCircle, ArrowRightCircle, Camera, ImagePlus, Trash2, Upload, X } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/resources'
import { errorMessage } from '../api/http'
import { Avatar } from '../components/ui/Avatar'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { useToast } from '../context/ToastContext'
import type { Photo } from '../types/models'
import { mediaUrl } from '../utils/media'

export function PhotosPage() {
  const { tripId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const { notify } = useToast()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [caption, setCaption] = useState('')
  const [day, setDay] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [removing, setRemoving] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState('')
  const [retry, setRetry] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try { const items = await api.photos.list(tripId); setPhotos(items); setFailure('') }
    catch (error) { setFailure(errorMessage(error)) }
    finally { setLoading(false) }
  }, [tripId])
  useEffect(() => { void load() }, [load, retry])
  useEffect(() => { if (searchParams.get('add') === '1') { inputRef.current?.click(); setSearchParams({}, { replace: true }) } }, [searchParams, setSearchParams])

  const acceptFiles = (selected: FileList | File[]) => {
    const images = Array.from(selected).filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 5 * 1024 * 1024)
    if (!images.length) { notify('Choose JPG, PNG or WebP images under 5 MB.', 'error'); return }
    setFiles((current) => [...current, ...images])
  }
  const upload = async () => {
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        if (caption.trim()) form.append('caption', caption.trim())
        if (day) form.append('day', day)
        await api.photos.add(tripId, form)
      }
      setFiles([]); setCaption(''); setDay(''); notify(`${files.length} ${files.length === 1 ? 'photo added' : 'photos added'} to your memories.`); await load()
    } catch (error) { notify(errorMessage(error), 'error') }
    finally { setUploading(false) }
  }
  const remove = async () => {
    if (!removing) return
    try { await api.photos.remove(removing._id); setPhotos((items) => items.filter((item) => item._id !== removing._id)); notify('Photo removed.') }
    catch (error) { notify(errorMessage(error), 'error') }
    finally { setRemoving(null) }
  }
  const onDrop = (event: React.DragEvent) => { event.preventDefault(); setDragging(false); acceptFiles(event.dataTransfer.files) }
  const moveLightbox = (direction: number) => setLightboxIndex((index) => index === null ? null : (index + direction + photos.length) % photos.length)

  return <div className="photos-page page-enter"><div className="page-topline"><Link to={`/trips/${tripId}`} className="back-link"><ArrowLeft size={18} /> Trip</Link><span className="page-top-kicker">LITTLE TIME CAPSULES</span></div><header className="page-heading"><span className="eyebrow">A PLACE FOR THE GOOD STUFF</span><h1>Photos</h1><p className="photo-script">Collect moments, not things! <span>♥</span></p></header>
    <section className={`photo-dropzone${dragging ? ' dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
      <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { if (event.target.files) acceptFiles(event.target.files); event.target.value = '' }} />
      <span className="drop-icon"><ImagePlus size={24} /></span><div><strong>Drop a memory here</strong><span>or choose a few from your camera roll</span></div><button className="button button-secondary" onClick={() => inputRef.current?.click()}><Upload size={16} />Choose photos</button>
    </section>
    {files.length > 0 && <section className="pending-upload surface"><div className="pending-files">{files.map((file, index) => <div key={`${file.name}-${index}`}><img src={URL.createObjectURL(file)} alt="" /><button aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, position) => position !== index))}><X size={13} /></button></div>)}</div><div className="photo-meta-fields"><label className="field"><span>Caption <em>(Optional)</em></span><input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="A day we'll keep" /></label><label className="field"><span>Trip day <em>(Optional)</em></span><input type="number" min="1" value={day} onChange={(event) => setDay(event.target.value)} placeholder="Day 1" /></label></div><button className="button button-primary" disabled={uploading} onClick={() => void upload()}>{uploading ? 'Adding memories…' : `Add ${files.length} ${files.length === 1 ? 'photo' : 'photos'}`}</button></section>}
    {failure ? <ErrorState message={failure} retry={() => setRetry((value) => value + 1)} /> : loading ? <LoadingState label="Opening the memory album" /> : photos.length ? <div className="photo-grid">{photos.map((photo, index) => <article className="photo-tile" key={photo._id}><button className="photo-image-button" onClick={() => setLightboxIndex(index)} aria-label={`View photo ${index + 1}`}><img src={mediaUrl(photo.imageUrl)} alt={photo.caption || `Trip memory ${index + 1}`} loading="lazy" /></button><div className="photo-caption"><span>{photo.caption || 'A lovely little moment'}{photo.day ? <small>Day {photo.day}</small> : null}</span><Avatar user={photo.uploadedBy} size="sm" /></div><button className="photo-delete" aria-label="Delete photo" onClick={() => setRemoving(photo)}><Trash2 size={16} /></button></article>)}</div> : <EmptyState title="Your album is waiting" detail="Add a few photos and keep the little moments close." action={<Camera size={22} />} />}
    {lightboxIndex !== null && photos[lightboxIndex] && <div className="lightbox" role="dialog" aria-modal="true" onClick={(event) => { if (event.target === event.currentTarget) setLightboxIndex(null) }}><button className="lightbox-close" aria-label="Close photo" onClick={() => setLightboxIndex(null)}><X size={21} /></button><button className="lightbox-arrow left" aria-label="Previous photo" onClick={() => moveLightbox(-1)}><ArrowLeftCircle size={32} /></button><figure><img src={mediaUrl(photos[lightboxIndex]?.imageUrl)} alt={photos[lightboxIndex]?.caption || 'Trip photo'} /><figcaption>{photos[lightboxIndex]?.caption || 'A lovely little moment'} <span>· {photos[lightboxIndex]?.uploadedBy.name}</span></figcaption></figure><button className="lightbox-arrow right" aria-label="Next photo" onClick={() => moveLightbox(1)}><ArrowRightCircle size={32} /></button></div>}
    {removing && <ConfirmDialog title="Remove this memory?" message="This photo will be permanently removed from the trip album." confirmLabel="Delete photo" onClose={() => setRemoving(null)} onConfirm={() => void remove()} />}
  </div>
}