import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, PlaneTakeoff, AlertCircle } from 'lucide-react'
import { api } from '../../api/resources'
import { errorMessage } from '../../api/http'

interface JoinTripModalProps {
  onClose: () => void
}

export function JoinTripModal({ onClose }: JoinTripModalProps) {
  const navigate = useNavigate()
  const [chars, setChars] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on open
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const code = chars.join('')
  const isComplete = code.length === 6 && chars.every(Boolean)

  const handleChar = (index: number, value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!upper) return

    // Handle paste of full code
    if (upper.length >= 6) {
      const pasted = upper.slice(0, 6).split('')
      setChars(pasted)
      setError('')
      inputRefs.current[5]?.focus()
      return
    }

    const next = [...chars]
    next[index] = upper[0]
    setChars(next)
    setError('')

    // Auto-advance to next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (chars[index]) {
        const next = [...chars]
        next[index] = ''
        setChars(next)
      } else if (index > 0) {
        const next = [...chars]
        next[index - 1] = ''
        setChars(next)
        inputRefs.current[index - 1]?.focus()
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    } else if (event.key === 'Enter' && isComplete) {
      void handleJoin()
    }
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault()
    const text = event.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    if (text.length > 0) {
      const next = text.split('').concat(Array(6).fill('')).slice(0, 6)
      setChars(next)
      setError('')
      const nextFocus = Math.min(text.length, 5)
      inputRefs.current[nextFocus]?.focus()
    }
  }

  const handleJoin = async () => {
    if (!isComplete) {
      setError('Please enter all 6 characters of the invitation code.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const trip = await api.trips.join(code)
      setSuccess(true)
      setTimeout(() => {
        navigate(`/trips/${trip._id}`)
        onClose()
      }, 1400)
    } catch (err: unknown) {
      setError(errorMessage(err))
      // Clear chars on invalid code
      if (errorMessage(err).toLowerCase().includes('not valid') || errorMessage(err).toLowerCase().includes('invalid')) {
        setChars(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section className="dialog join-trip-dialog" role="dialog" aria-modal="true" aria-labelledby="join-trip-title">
        <button className="icon-button dialog-close" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="join-trip-icon">
          <PlaneTakeoff size={22} />
        </div>

        <h2 id="join-trip-title">Join a Trip</h2>
        <p className="join-trip-subtitle">Enter the 6-character code shared by your trip organiser.</p>

        {success ? (
          <div className="join-success">
            <span className="join-success-icon">✓</span>
            <strong>You're in! Redirecting…</strong>
          </div>
        ) : (
          <>
            <div className="invite-code-grid" onPaste={handlePaste} role="group" aria-label="Invitation code">
              {chars.map((char, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  className={`invite-char-box${char ? ' filled' : ''}${error ? ' error' : ''}`}
                  type="text"
                  inputMode="text"
                  maxLength={6}
                  value={char}
                  autoComplete="off"
                  autoCapitalize="characters"
                  aria-label={`Code character ${i + 1}`}
                  onChange={(e) => handleChar(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                />
              ))}
            </div>

            {error && (
              <div className="join-error" role="alert">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div className="join-trip-actions">
              <button
                id="join-trip-submit"
                className="button button-primary button-wide"
                onClick={() => void handleJoin()}
                disabled={loading || !isComplete}
              >
                {loading ? 'Joining…' : 'Join Trip'}
              </button>
              <button className="button button-secondary button-wide" onClick={onClose}>
                Cancel
              </button>
            </div>

            <p className="join-trip-hint">
              Ask your trip organiser to share the invitation code from the trip's overview page.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
