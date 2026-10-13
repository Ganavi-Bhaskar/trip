import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/resources'
import { LoadingState } from '../components/ui/States'
import { useState } from 'react'

export function ExpenseEditRedirect() {
  const { expenseId = '' } = useParams()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    void api.expenses.get(expenseId).then((expense) => navigate(`/trips/${expense.trip}/expenses/${expenseId}/edit`, { replace: true }))
      .catch(() => setFailed(true))
  }, [expenseId, navigate])
  return failed ? <Navigate to="/dashboard" replace /> : <LoadingState label="Finding this expense" />
}