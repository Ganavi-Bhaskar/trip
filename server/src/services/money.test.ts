import { describe, expect, it } from 'vitest'
import { computeBalances, minimizeTransactions } from './balanceService'
import { computeShares } from './splitService'

describe('computeShares', () => {
  it('splits equally with deterministic remainder allocation', () => {
    expect(computeShares(1000, 'equal', ['user-c', 'user-a', 'user-b'])).toEqual([
      { user: 'user-a', amount: 334 },
      { user: 'user-b', amount: 333 },
      { user: 'user-c', amount: 333 },
    ])
  })

  it('splits percentages using largest-remainder rounding', () => {
    expect(computeShares(1000, 'percentage', ['a', 'b', 'c'], [
      { user: 'a', value: 3334 }, { user: 'b', value: 3333 }, { user: 'c', value: 3333 },
    ])).toEqual([{ user: 'a', amount: 334 }, { user: 'b', amount: 333 }, { user: 'c', amount: 333 }])
  })

  it('rejects exact shares that do not sum to the expense', () => {
    expect(() => computeShares(1000, 'exact', ['a', 'b'], [
      { user: 'a', value: 400 }, { user: 'b', value: 500 },
    ])).toThrow('Exact shares must add up to the full expense amount.')
  })

  it('shares a 4500 expense between three travelers', () => {
    const shares = computeShares(4500, 'equal', ['a', 'b', 'c'])
    const balances = computeBalances([{ paidBy: 'a', amountInTripCurrency: 4500, computedShares: shares }], [], ['a', 'b', 'c'])
    expect(balances).toEqual([
      { user: 'a', paid: 4500, owes: 1500, net: 3000 },
      { user: 'b', paid: 0, owes: 1500, net: -1500 },
      { user: 'c', paid: 0, owes: 1500, net: -1500 },
    ])
  })
})

describe('balances and settlement suggestions', () => {
  it('keeps member nets at zero sum', () => {
    const balances = computeBalances([
      { paidBy: 'a', amountInTripCurrency: 4500, computedShares: [{ user: 'a', amount: 1500 }, { user: 'b', amount: 1500 }, { user: 'c', amount: 1500 }] },
    ], [], ['a', 'b', 'c'])
    expect(balances.reduce((sum, balance) => sum + balance.net, 0)).toBe(0)
  })

  it('uses no more transfers than needed for the group', () => {
    const transfers = minimizeTransactions([
      { user: 'a', net: 200 }, { user: 'b', net: 100 }, { user: 'c', net: -150 }, { user: 'd', net: -150 },
    ])
    expect(transfers).toHaveLength(3)
    expect(transfers.length).toBeLessThanOrEqual(4 - 1)
    expect(transfers.reduce((sum, transfer) => sum + transfer.amount, 0)).toBe(300)
  })

  it('reduces balances after settled payments', () => {
    const balances = computeBalances([
      { paidBy: 'a', amountInTripCurrency: 3000, computedShares: [{ user: 'a', amount: 1000 }, { user: 'b', amount: 1000 }, { user: 'c', amount: 1000 }] },
    ], [{ from: 'b', to: 'a', amount: 1000 }], ['a', 'b', 'c'])
    expect(balances.map(({ user, net }) => [user, net])).toEqual([['a', 1000], ['b', 0], ['c', -1000]])
  })
})