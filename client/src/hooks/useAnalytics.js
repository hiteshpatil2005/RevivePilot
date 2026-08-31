import { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '../services/analyticsApi';

export function useAnalytics(period = '7D') {
  const [metrics, setMetrics] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [recoveryRateChart, setRecoveryRateChart] = useState([]);
  const [strategyPerformance, setStrategyPerformance] = useState([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState([]);
  const [aiEffectiveness, setAiEffectiveness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [m, revChart, recChart, strat, breakdown, aiEff] = await Promise.all([
        analyticsApi.getMetrics(period),
        analyticsApi.getRevenueChart(period),
        analyticsApi.getRecoveryRate(period),
        analyticsApi.getStrategyPerformance(),
        analyticsApi.getRevenueBreakdown(),
        analyticsApi.getAIEffectiveness(),
      ]);

      setMetrics(m);
      setRevenueChart(revChart);
      setRecoveryRateChart(recChart);
      setStrategyPerformance(strat);
      setRevenueBreakdown(breakdown);
      setAiEffectiveness(aiEff);
    } catch (err) {
      console.error('[useAnalytics] Failed to fetch analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    metrics,
    revenueChart,
    recoveryRateChart,
    strategyPerformance,
    revenueBreakdown,
    aiEffectiveness,
    loading,
    error,
    refresh: fetchAnalytics,
  };
}
