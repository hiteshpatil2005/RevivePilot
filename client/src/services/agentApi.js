/**
 * agentApi.js — AI Agents API service
 *
 * Endpoints:
 *   GET /api/agents/status
 *   GET /api/agents/activity
 */

import { axiosInstance, withFallback } from './api';
import { MOCK_AGENTS, MOCK_AGENT_ACTIVITY } from '../data/mockData';

export const agentApi = {
  /**
   * getStatuses()
   * Returns: array of agent status objects
   */
  async getStatuses() {
    return withFallback(
      () => axiosInstance.get('/agents/status'),
      MOCK_AGENTS,
      'agentApi.getStatuses'
    );
  },

  /**
   * getActivity()
   * Returns: array of recent agent activity
   */
  async getActivity() {
    return withFallback(
      () => axiosInstance.get('/agents/activity'),
      MOCK_AGENT_ACTIVITY || [],
      'agentApi.getActivity'
    );
  },
};
