/**
 * analyticsApi.js — Analytics API service
 *
 * Endpoints:
 *   GET /api/analytics/metrics?period=7D
 *   GET /api/analytics/revenue-chart?period=7D
 *   GET /api/analytics/recovery-rate?period=7D
 *   GET /api/analytics/strategies
 *   GET /api/analytics/breakdown
 *   GET /api/analytics/ai-effectiveness
 *   GET /api/analytics/export?period=7D&format=csv
 */

import { axiosInstance, withFallback } from './api';
import {
  MOCK_ANALYTICS_METRICS,
  REVENUE_CHART_DATA,
  MOCK_RECOVERY_RATE_DATA,
  MOCK_STRATEGY_PERFORMANCE,
  MOCK_REVENUE_BREAKDOWN,
  MOCK_AI_EFFECTIVENESS,
} from '../data/mockData';

export const analyticsApi = {
  async getMetrics(period = '7D') {
    return withFallback(
      () => axiosInstance.get('/analytics/metrics', { params: { period } }),
      MOCK_ANALYTICS_METRICS,
      'analyticsApi.getMetrics'
    );
  },

  async getRevenueChart(period = '7D') {
    const days = period === '90D' ? 90 : period === '30D' ? 30 : 7;
    return withFallback(
      () => axiosInstance.get('/analytics/chart', { params: { days } }),
      [],
      'analyticsApi.getRevenueChart'
    );
  },

  async getRecoveryRate(period = '7D') {
    return withFallback(
      () => axiosInstance.get('/analytics/recovery-rate', { params: { period } }),
      MOCK_RECOVERY_RATE_DATA[period] || MOCK_RECOVERY_RATE_DATA['7D'],
      'analyticsApi.getRecoveryRate'
    );
  },

  async getStrategyPerformance() {
    return withFallback(
      () => axiosInstance.get('/analytics/strategies'),
      MOCK_STRATEGY_PERFORMANCE,
      'analyticsApi.getStrategyPerformance'
    );
  },

  async getRevenueBreakdown() {
    return withFallback(
      () => axiosInstance.get('/analytics/breakdown'),
      MOCK_REVENUE_BREAKDOWN,
      'analyticsApi.getRevenueBreakdown'
    );
  },

  async getAIEffectiveness() {
    return withFallback(
      () => axiosInstance.get('/analytics/ai-effectiveness'),
      MOCK_AI_EFFECTIVENESS,
      'analyticsApi.getAIEffectiveness'
    );
  },
};
