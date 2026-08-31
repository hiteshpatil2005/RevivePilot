import { useState, useEffect, useCallback } from 'react';
import { policyApi } from '../services/policyApi';
import { useToast } from '../context/ToastContext';

export function usePolicies() {
  const [policies, setPolicies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await policyApi.getPolicies();
      setPolicies(data);
    } catch (err) {
      console.error('[usePolicies] Failed to fetch policies:', err);
      setError(err.message || 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const updateRetry = async (data) => {
    setSaving(true);
    try {
      await policyApi.updateRetryPolicy(data);
      setPolicies((prev) => ({ ...prev, retry: data }));
      toast.success('Retry policy updated successfully');
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to update retry policy');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateAmount = async (data) => {
    setSaving(true);
    try {
      await policyApi.updateAmountLimit(data);
      setPolicies((prev) => ({ ...prev, amountLimit: data }));
      toast.success('Amount limit policy updated successfully');
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to update amount limits');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateStopping = async (data) => {
    setSaving(true);
    try {
      await policyApi.updateStoppingRules(data);
      setPolicies((prev) => ({ ...prev, stoppingRules: data }));
      toast.success('Stopping rules updated successfully');
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to update stopping rules');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateEscalation = async (data) => {
    setSaving(true);
    try {
      await policyApi.updateEscalationRules(data);
      setPolicies((prev) => ({ ...prev, escalationRules: data }));
      toast.success('Escalation rules updated successfully');
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to update escalation rules');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const evaluate = async (params) => {
    try {
      return await policyApi.evaluatePolicy(params);
    } catch (err) {
      toast.error(err.message || 'Policy simulation failed');
      throw err;
    }
  };

  return {
    policies,
    loading,
    saving,
    error,
    updateRetry,
    updateAmount,
    updateStopping,
    updateEscalation,
    evaluate,
    refresh: fetchPolicies,
  };
}
