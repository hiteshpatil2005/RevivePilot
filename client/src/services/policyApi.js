/**
 * policyApi.js — Policy Center API service
 *
 * Endpoints:
 *   GET  /api/policies
 *   PUT  /api/policies/retry
 *   PUT  /api/policies/amount-limit
 *   PUT  /api/policies/stopping-rules
 *   PUT  /api/policies/escalation-rules
 *   POST /api/policies/evaluate
 */

import { axiosInstance, withFallback } from './api';
import {
  DEFAULT_RETRY_POLICY,
  MOCK_STOPPING_RULES,
  MOCK_ESCALATION_RULES,
  MOCK_POLICY_OVERVIEW,
  MOCK_POLICY_CATEGORIES,
} from '../data/mockData';

const DEFAULT_POLICIES = {
  retry: DEFAULT_RETRY_POLICY,
  amountLimit: { maxAmountINR: 50000, action: 'require_approval' },
  stoppingRules: MOCK_STOPPING_RULES,
  escalationRules: MOCK_ESCALATION_RULES,
};

export const policyApi = {
  /**
   * getPolicies()
   * Returns: { retry, amountLimit, stoppingRules, escalationRules, overview, categories }
   */
  async getPolicies() {
    return withFallback(
      () => axiosInstance.get('/policies'),
      {
        ...DEFAULT_POLICIES,
        overview: MOCK_POLICY_OVERVIEW,
        categories: MOCK_POLICY_CATEGORIES,
      },
      'policyApi.getPolicies'
    );
  },

  /**
   * updateRetryPolicy(data)
   */
  async updateRetryPolicy(data) {
    return withFallback(
      () => axiosInstance.put('/policies/retry', data),
      async () => {
        await new Promise(r => setTimeout(r, 400));
        return { success: true, _isMock: true };
      },
      'policyApi.updateRetryPolicy'
    );
  },

  /**
   * updateAmountLimit(data)
   */
  async updateAmountLimit(data) {
    return withFallback(
      () => axiosInstance.put('/policies/amount-limit', data),
      async () => {
        await new Promise(r => setTimeout(r, 400));
        return { success: true, _isMock: true };
      },
      'policyApi.updateAmountLimit'
    );
  },

  /**
   * updateStoppingRules(data)
   */
  async updateStoppingRules(data) {
    return withFallback(
      () => axiosInstance.put('/policies/stopping-rules', data),
      async () => {
        await new Promise(r => setTimeout(r, 400));
        return { success: true, _isMock: true };
      },
      'policyApi.updateStoppingRules'
    );
  },

  /**
   * updateEscalationRules(data)
   */
  async updateEscalationRules(data) {
    return withFallback(
      () => axiosInstance.put('/policies/escalation-rules', data),
      async () => {
        await new Promise(r => setTimeout(r, 400));
        return { success: true, _isMock: true };
      },
      'policyApi.updateEscalationRules'
    );
  },

  /**
   * evaluatePolicy({ amount, retryCount, aiConfidence, recoveryProbability })
   * Returns: { decision: 'APPROVED' | 'BLOCKED' | 'MANUAL_APPROVAL', checks: [] }
   */
  async evaluatePolicy(params) {
    return withFallback(
      () => axiosInstance.post('/policies/evaluate', params),
      async () => {
        await new Promise(r => setTimeout(r, 600));
        // Client-side preview (clearly marked as client-side)
        const { amount, retryCount, aiConfidence, recoveryProbability } = params;
        const checks = [
          { label: 'Amount limit', pass: amount <= 50000, value: `₹${amount?.toLocaleString('en-IN')}`, note: amount <= 50000 ? 'Within limit' : 'Exceeds limit' },
          { label: 'Retry count', pass: retryCount < 3, value: `${retryCount}/3`, note: retryCount < 3 ? 'Under max' : 'Max reached' },
          { label: 'AI confidence', pass: aiConfidence >= 70, value: `${aiConfidence}%`, note: aiConfidence >= 70 ? 'Above threshold' : 'Below threshold' },
          { label: 'Recovery probability', pass: recoveryProbability >= 40, value: `${recoveryProbability}%`, note: recoveryProbability >= 40 ? 'Viable' : 'Too low' },
        ];
        const blocked = checks.filter(c => !c.pass);
        let decision;
        if (blocked.length === 0) decision = 'APPROVED';
        else if (blocked.length === 1 && !checks[0].pass) decision = 'MANUAL_APPROVAL';
        else decision = 'BLOCKED';
        return { decision, checks, _clientPreview: true, _isMock: true };
      },
      'policyApi.evaluatePolicy'
    );
  },
};
