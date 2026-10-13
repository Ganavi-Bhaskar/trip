import { BedDouble, Bus, Camera, CircleHelp, ShoppingBag, Sparkles, Ticket, Utensils } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const categories: Array<{ key: string; label: string; icon: LucideIcon; tint: string }> = [
  { key: 'food', label: 'Food & Drinks', icon: Utensils, tint: 'rose' },
  { key: 'stay', label: 'Stay', icon: BedDouble, tint: 'pink' },
  { key: 'transport', label: 'Transport', icon: Bus, tint: 'blue' },
  { key: 'activities', label: 'Activities', icon: Ticket, tint: 'violet' },
  { key: 'sightseeing', label: 'Sightseeing', icon: Camera, tint: 'yellow' },
  { key: 'shopping', label: 'Shopping', icon: ShoppingBag, tint: 'mint' },
  { key: 'other', label: 'Other', icon: Sparkles, tint: 'lavender' },
]

export const activityCategories = [
  { key: 'transport', label: 'Transport' }, { key: 'food', label: 'Food' }, { key: 'stay', label: 'Stay' },
  { key: 'activity', label: 'Activity' }, { key: 'sightseeing', label: 'Sightseeing' }, { key: 'shopping', label: 'Shopping' }, { key: 'other', label: 'Other' },
]

export const categoryFor = (key: string) => categories.find((category) => category.key === key) ?? { key: 'other', label: 'Other', icon: CircleHelp, tint: 'lavender' }