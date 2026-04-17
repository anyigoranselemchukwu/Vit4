// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import ModernDashboard from '../components/ModernDashboard'
import { fetchHealth, fetchHistory } from '../api'
import { LoadingSpinner } from '../components/LoadingStates'

export default function DashboardPage() {
  const [stats, setStats] = useState({})
  const [health, setHealth] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Fetch health data
      const healthData = await fetchHealth()
      setHealth({
        db_connected: healthData.db_connected || false,
        models_loaded: healthData.models_loaded || false,
        clv_tracking_enabled: healthData.clv_tracking_enabled || false,
      })

      // Fetch recent predictions for stats
      const history = await fetchHistory(50, 0)
      const predictions = history.predictions || []

      // Calculate stats
      const totalPredictions = predictions.length
      const recentPredictions = predictions.slice(0, 10)
      const avgConfidence = recentPredictions.length > 0
        ? recentPredictions.reduce((sum, p) => sum + (p.avg_1x2_confidence || 0), 0) / recentPredictions.length
        : 0
      const successRate = recentPredictions.length > 0
        ? (recentPredictions.filter(p => p.result === 'win').length / recentPredictions.length) * 100
        : 0

      setStats({
        totalPredictions,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        activeModels: healthData.models_loaded || 0,
      })

      setLoading(false)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setLoading(false)
    }
  }

  return (
    <ModernDashboard
      stats={stats}
      health={health}
      loading={loading}
      onRefresh={loadData}
    />
  )
}