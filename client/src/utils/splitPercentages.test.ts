import { describe, expect, it } from 'vitest'
import { percentagesFromWeights, sharesFromPercentages } from './splitPercentages'

describe('percentagesFromWeights', () => {
  it('converts weights to percentages totaling exactly 100%', () => {
    const percentages = percentagesFromWeights([
      { user: 'a', value: 1 },
      { user: 'b', value: 1 },
      { user: 'c', value: 1 },
    ])

    expect(percentages).toEqual({ a: 33.34, b: 33.33, c: 33.33 })
    expect(Object.values(percentages).reduce((sum, value) => sum + Math.round(value * 100), 0)).toBe(10000)
  })

  it('handles uneven weights and rejects empty allocations safely', () => {
    expect(percentagesFromWeights([{ user: 'a', value: 1 }, { user: 'b', value: 2 }])).toEqual({ a: 33.33, b: 66.67 })
    expect(percentagesFromWeights([{ user: 'a', value: 0 }, { user: 'b', value: 0 }])).toEqual({ a: 0, b: 0 })
  })

  it('allocates percentage remainder exactly like the trip ledger', () => {
    expect(sharesFromPercentages(1000, [
      { user: 'c', basisPoints: 3333 },
      { user: 'a', basisPoints: 3334 },
      { user: 'b', basisPoints: 3333 },
    ])).toEqual({ c: 333, a: 334, b: 333 })
  })
})
