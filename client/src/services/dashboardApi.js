/**
 * dashboardApi.js — Dashboard metrics API service
 *
 * Endpoints:
 *   GET /api/dashboard/metrics
 *   GET /api/dashboard/live-activity
 */

import { axiosInstance, withFallback } from './api';
import { MOCK_DASHBOARD_METRICS, MOCK_LIVE_ACTIVITY } from '../data/mockData';

export const dashboardApi = {
  /**
   * getMetrics()
   * Returns: { revenueAtRisk, expectedRecovery, recoveredRevenue, activeCases, ... }
   */
  async getMetrics() {
    return withFallback(
      () => axiosInstance.get('/dashboard/metrics'),
      MOCK_DASHBOARD_METRICS,
      'dashboardApi.getMetrics'
    );
  },

  /**
   * getLiveActivity()
   * Returns: Array of live activity events
   */
  async getLiveActivity() {
    return withFallback(
      () => axiosInstance.get('/dashboard/live-activity'),
      MOCK_LIVE_ACTIVITY,
      'dashboardApi.getLiveActivity'
    );
  },
};
