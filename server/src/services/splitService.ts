import { ApiError } from '../utils/ApiError'

export type SplitType = 'equal' | 'custom' | 'percentage' | 'exact'
export interface SplitInput { user: string; value: number }
export interface ComputedShare { user: string; amount: number }

export function computeShares(
  totalMinor: number,
  splitType: SplitType,
  participants: string[],
  customSplits: SplitInput[] = [],
): ComputedShare[] {
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) throw new ApiError(400, 'Amount must be a non-negative integer in minor units.')
  const users = [...new Set(participants)].sort((left, right) => left.localeCompare(right))
  if (users.length === 0) throw new ApiError(400, 'Select at least one traveler to split this expense.')
  if (users.length !== participants.length) throw new ApiError(400, 'A traveler can only appear once in the split.')
  if (splitType === 'equal') {
    const base = Math.floor(totalMinor / users.length)
    const remainder = totalMinor % users.length
    return users.map((user, index) => ({ user, amount: base + (index < remainder ? 1 : 0) }))
  }

  const entries = normalizeEntries(users, customSplits)
  if (splitType === 'exact') {
    if (entries.some((entry) => !Number.isSafeInteger(entry.value) || entry.value < 0)) throw new ApiError(400, 'Exact shares must be whole minor-unit amounts.')
    if (entries.reduce((sum, entry) => sum + entry.value, 0) !== totalMinor) throw new ApiError(400, 'Exact shares must add up to the full expense amount.')
    return entries.map(({ user, value }) => ({ user, amount: value }))
  }

  if (entries.some((entry) => !Number.isFinite(entry.value) || entry.value < 0)) throw new ApiError(400, 'Split values must be non-negative numbers.')
  const weightTotal = entries.reduce((sum, entry) => sum + entry.value, 0)
  if (weightTotal <= 0) throw new ApiError(400, 'Split values must add up to more than zero.')
  if (splitType === 'percentage' && weightTotal !== 10000) throw new ApiError(400, 'Percentages must add up to 100%.')

  const allocations = entries.map(({ user, value }) => {
    const exact = splitType === 'percentage' ? totalMinor * value / 10000 : totalMinor * value / weightTotal
    return { user, amount: Math.floor(exact), remainder: exact - Math.floor(exact) }
  })
  let leftover = totalMinor - allocations.reduce((sum, allocation) => sum + allocation.amount, 0)
  const ranked = [...allocations].sort((left, right) => right.remainder - left.remainder || left.user.localeCompare(right.user))
  for (let index = 0; index < leftover; index += 1) {
    const allocation = ranked[index % ranked.length]
    if (allocation) allocation.amount += 1
  }
  leftover = 0
  return allocations.map(({ user, amount }) => ({ user, amount }))
}

function normalizeEntries(users: string[], splits: SplitInput[]): SplitInput[] {
  if (splits.length !== users.length) throw new ApiError(400, 'Provide one split value for each selected traveler.')
  const byUser = new Map(splits.map((split) => [split.user, split]))
  if (byUser.size !== splits.length || users.some((user) => !byUser.has(user))) {
    throw new ApiError(400, 'Split values must match the selected travelers.')
  }
  return users.map((user) => byUser.get(user) as SplitInput)
}