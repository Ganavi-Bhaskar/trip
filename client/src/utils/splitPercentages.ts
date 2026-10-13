export function percentagesFromWeights(splits: Array<{ user: string; value: number }>): Record<string, number> {
  const total = splits.reduce((sum, split) => sum + split.value, 0)
  if (!Number.isFinite(total) || total <= 0 || splits.some((split) => !Number.isFinite(split.value) || split.value < 0)) {
    return Object.fromEntries(splits.map(({ user }) => [user, 0]))
  }

  const allocated = splits.map(({ user, value }) => {
    const exactBasisPoints = value / total * 10000
    const basisPoints = Math.floor(exactBasisPoints)
    return { user, basisPoints, remainder: exactBasisPoints - basisPoints }
  })
  const ordered = [...allocated].sort((left, right) => right.remainder - left.remainder || left.user.localeCompare(right.user))
  const leftover = 10000 - allocated.reduce((sum, split) => sum + split.basisPoints, 0)
  for (let index = 0; index < leftover; index += 1) {
    const split = ordered[index]
    if (split) split.basisPoints += 1
  }

  return Object.fromEntries(allocated.map(({ user, basisPoints }) => [user, basisPoints / 100]))
}

export function sharesFromPercentages(totalMinor: number, splits: Array<{ user: string; basisPoints: number }>): Record<string, number> {
  const allocations = splits.map(({ user, basisPoints }) => {
    const exactShare = totalMinor * basisPoints / 10000
    const amount = Math.floor(exactShare)
    return { user, amount, remainder: exactShare - amount }
  })
  const ordered = [...allocations].sort((left, right) => right.remainder - left.remainder || left.user.localeCompare(right.user))
  const leftover = totalMinor - allocations.reduce((sum, share) => sum + share.amount, 0)
  for (let index = 0; index < leftover; index += 1) {
    const share = ordered[index]
    if (share) share.amount += 1
  }

  return Object.fromEntries(allocations.map(({ user, amount }) => [user, amount]))
}
