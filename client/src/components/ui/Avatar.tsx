import { UserRound } from 'lucide-react'
import type { User } from '../../types/models'
import { mediaUrl } from '../../utils/media'

const avatarColors = ['#E9DDFB', '#DDF2E8', '#FFE0E8', '#DDEBFA', '#F8E9C8', '#E9E7FF']

export function Avatar({ user, size = 'md', ring = false }: { user?: Partial<User> | null; size?: 'sm' | 'md' | 'lg'; ring?: boolean }) {
  const name = user?.name ?? 'Traveler'
  const colorIndex = [...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % avatarColors.length
  return <span className={`avatar avatar-${size}${ring ? ' avatar-ring' : ''}`} style={{ backgroundColor: avatarColors[colorIndex] }}>
    {user?.avatar ? <img src={mediaUrl(user.avatar)} alt="" /> : name ? name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() : <UserRound size={17} />}
  </span>
}