/**
 * auditApi.js — Audit Logs API service
 *
 * Endpoints:
 *   GET /api/audit-logs
 *   GET /api/audit-logs/:id
 *   GET /api/audit-logs/export?format=csv
 */

import { axiosInstance, withFallback } from './api';
import { MOCK_AUDIT_LOGS } from '../data/mockData';

export const auditApi = {
  /**
   * getLogs(params)
   * Params: { eventType, actor, result, caseId, dateFrom, dateTo, page, limit }
   * Returns: { logs: [], total }
   */
  async getLogs(params = {}) {
    return withFallback(
      () => axiosInstance.get('/audit-logs', { params }),
      { logs: MOCK_AUDIT_LOGS, total: MOCK_AUDIT_LOGS.length },
      'auditApi.getLogs'
    );
  },

  /**
   * getLog(id)
   */
  async getLog(id) {
    return withFallback(
      () => axiosInstance.get(`/audit-logs/${id}`),
      async () => {
        const log = MOCK_AUDIT_LOGS.find(l => l.id === id);
        if (!log) {
          const err = new Error('Log not found');
          err.response = { status: 404 };
          throw err;
        }
        return log;
      },
      `auditApi.getLog(${id})`
    );
  },
};
