export interface BalanceExpense {
  paidBy: string | { toString(): string }
  amountInTripCurrency: number
  computedShares: Array<{ user: string | { toString(): string }; amount: number }>
}
export interface BalanceSettlement {
  from: string | { toString(): string }
  to: string | { toString(): string }
  amount: number
}
export interface MemberBalance { user: string; paid: number; owes: number; net: number }
export interface SuggestedTransfer { from: string; to: string; amount: number }

export function computeBalances(expenses: BalanceExpense[], settledSettlements: BalanceSettlement[], members: string[]): MemberBalance[] {
  const balances = new Map(members.map((user) => [user, { user, paid: 0, owes: 0, net: 0 }]))
  for (const expense of expenses) {
    const payerId = String(expense.paidBy)
    const payer = balances.get(payerId)
    if (payer) payer.paid += expense.amountInTripCurrency
    for (const share of expense.computedShares) {
      const member = balances.get(String(share.user))
      if (member) member.owes += share.amount
    }
  }
  for (const settlement of settledSettlements) {
    const from = balances.get(String(settlement.from))
    const to = balances.get(String(settlement.to))
    if (from) from.net += settlement.amount
    if (to) to.net -= settlement.amount
  }
  for (const member of balances.values()) member.net += member.paid - member.owes
  const result = [...balances.values()]
  if (result.reduce((sum, member) => sum + member.net, 0) !== 0) {
    throw new Error('Balance invariant failed: member nets must sum to zero.')
  }
  return result
}

export function minimizeTransactions(nets: Array<{ user: string; net: number }>): SuggestedTransfer[] {
  const debtors = nets.filter((member) => member.net < 0).map((member) => ({ user: member.user, amount: -member.net }))
    .sort((left, right) => right.amount - left.amount || left.user.localeCompare(right.user))
  const creditors = nets.filter((member) => member.net > 0).map((member) => ({ user: member.user, amount: member.net }))
    .sort((left, right) => right.amount - left.amount || left.user.localeCompare(right.user))
  const transfers: SuggestedTransfer[] = []
  let debtorIndex = 0
  let creditorIndex = 0
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    if (!debtor || !creditor) break
    const amount = Math.min(debtor.amount, creditor.amount)
    if (amount > 0) transfers.push({ from: debtor.user, to: creditor.user, amount })
    debtor.amount -= amount
    creditor.amount -= amount
    if (debtor.amount === 0) debtorIndex += 1
    if (creditor.amount === 0) creditorIndex += 1
  }
  return transfers
}