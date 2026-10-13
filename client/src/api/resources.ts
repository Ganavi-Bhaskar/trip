import { http } from './http'
import type { Activity, Balance, Expense, Member, Photo, Traveler, Trip, TripStats, User } from '../types/models'

export const api = {
  auth: {
    login: async (payload: { email: string; password: string }) => (await http.post<{ data: { user: User; token: string } }>('/auth/login', payload)).data.data,
    register: async (payload: { name: string; email: string; password: string }) => (await http.post<{ data: { user: User; token: string } }>('/auth/register', payload)).data.data,
    me: async () => (await http.get<{ data: { user: User } }>('/auth/me')).data.data.user,
  },
  trips: {
    list: async (search = '') => (await http.get<{ data: { trips: Trip[] } }>('/trips', { params: search ? { search } : {} })).data.data.trips,
    get: async (id: string) => (await http.get<{ data: { trip: Trip; travelerCount: number; totalExpenses: number; progress: number; totalDays: number; nextUpcomingActivity: Activity | null } }>(`/trips/${id}`)).data.data,
    create: async (payload: Partial<Trip>) => (await http.post<{ data: { trip: Trip } }>('/trips', payload)).data.data.trip,
    update: async (id: string, payload: Partial<Trip>) => (await http.put<{ data: { trip: Trip } }>(`/trips/${id}`, payload)).data.data.trip,
    remove: async (id: string) => http.delete(`/trips/${id}`),
    join: async (code: string) => (await http.post<{ data: { trip: Trip } }>('/trips/join', { code })).data.data.trip,
    members: async (id: string) => (await http.get<{ data: { members: Member[] } }>(`/trips/${id}/members`)).data.data.members,
    regenerateCode: async (id: string) => (await http.post<{ data: { trip: Trip } }>(`/trips/${id}/invitations/regenerate`)).data.data.trip,
    revokeCode: async (id: string) => (await http.post<{ data: { trip: Trip } }>(`/trips/${id}/invitations/revoke`)).data.data.trip,
  },
  travelers: {
    list: async (id: string) => (await http.get<{ data: { travelers: Traveler[] } }>(`/trips/${id}/travelers`)).data.data.travelers,
    add: async (id: string, payload: { email: string; name?: string; role?: 'organizer' | 'member'; preferences?: string[] }) => (await http.post<{ data: { traveler: Traveler } }>(`/trips/${id}/travelers`, payload)).data.data.traveler,
    update: async (id: string, userId: string, payload: { role?: 'organizer' | 'member'; preferences?: string[] }) => http.patch(`/trips/${id}/travelers/${userId}`, payload),
    remove: async (id: string, userId: string) => http.delete(`/trips/${id}/travelers/${userId}`),
  },
  activities: {
    list: async (id: string, day?: number) => (await http.get<{ data: { activities: Activity[] } }>(`/trips/${id}/activities`, { params: day ? { day } : {} })).data.data.activities,
    create: async (id: string, payload: Omit<Activity, '_id' | 'trip' | 'image'>) => (await http.post<{ data: { activity: Activity } }>(`/trips/${id}/activities`, payload)).data.data.activity,
    update: async (id: string, payload: Partial<Activity>) => http.put(`/activities/${id}`, payload),
    remove: async (id: string) => http.delete(`/activities/${id}`),
  },
  expenses: {
    list: async (id: string, category = 'all') => (await http.get<{ data: { expenses: Expense[] } }>(`/trips/${id}/expenses`, { params: category !== 'all' ? { category } : {} })).data.data.expenses,
    get: async (id: string) => (await http.get<{ data: { expense: Expense } }>(`/expenses/${id}`)).data.data.expense,
    create: async (id: string, payload: Record<string, unknown>) => (await http.post<{ data: { expense: Expense } }>(`/trips/${id}/expenses`, payload)).data.data.expense,
    update: async (id: string, payload: Record<string, unknown>) => http.put(`/expenses/${id}`, payload),
    remove: async (id: string) => http.delete(`/expenses/${id}`),
  },
  balance: {
    get: async (id: string) => (await http.get<{ data: Balance }>(`/trips/${id}/balance`)).data.data,
    settlements: async (id: string) => (await http.get<{ data: { settlements: Balance['settlements'] } }>(`/trips/${id}/settlements`)).data.data.settlements,
    settle: async (id: string) => http.post(`/settlements/${id}/settle`),
  },
  photos: {
    list: async (id: string) => (await http.get<{ data: { photos: Photo[] } }>(`/trips/${id}/photos`)).data.data.photos,
    add: async (id: string, form: FormData) => (await http.post<{ data: { photo: Photo } }>(`/trips/${id}/photos`, form)).data.data.photo,
    remove: async (id: string) => http.delete(`/photos/${id}`),
  },
  stats: {
    get: async (id: string) => (await http.get<{ data: TripStats }>(`/trips/${id}/stats`)).data.data,
  },
  users: {
    update: async (payload: Record<string, unknown>) => (await http.put<{ data: { user: User } }>('/users/me', payload)).data.data.user,
    password: async (payload: { currentPassword: string; newPassword: string }) => http.put('/users/me/password', payload),
    remove: async (password: string) => http.delete('/users/me', { data: { password } }),
  },
  upload: async (endpoint: 'avatar' | 'trip-cover', file: File, tripId?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (tripId) form.append('tripId', tripId)
    return (await http.post<{ data: { url: string } }>(`/upload/${endpoint}`, form)).data.data.url
  },
}