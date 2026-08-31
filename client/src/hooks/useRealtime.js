import { useCallback } from 'react';
import { useRealtimeContext } from '../context/RealtimeContext';

/**
 * useRealtime — Convenience hook that wraps RealtimeContext.
 *
 * Returns:
 *   events            — activity feed (newest first)
 *   connectionStatus  — WS_STATUS string
 *   lastEvent         — most recent event
 *   demoMode          — true when no backend WebSocket
 *   triggerDemoEvent  — inject a demo event through the real pipeline
 *   subscribe         — register a custom event handler
 *
 * Future upgrade path (Part 4):
 *   Set VITE_WS_URL → WebSocket service auto-connects.
 *   All existing subscribers immediately receive real events.
 *   No changes needed in components that use this hook.
 */
export function useRealtime() {
  const {
    events,
    connectionStatus,
    demoMode,
    subscribe,
    triggerDemoEvent,
  } = useRealtimeContext();

  return {
    events,
    connectionStatus,
    lastEvent: events[0] ?? null,
    demoMode,
    subscribe,
    triggerDemoEvent,
    // Legacy compat: boolean connected for older components
    connected: connectionStatus === 'CONNECTED' || connectionStatus === 'DEMO',
  };
}

/**
 * useDemoEvent — Pre-built demo event factories.
 * Returns trigger functions for common demo scenarios.
 */
export function useDemoEvents() {
  const { triggerDemoEvent } = useRealtimeContext();

  const triggerPaymentFailure = useCallback(() => {
    const caseId = `RC-1${Math.floor(Math.random() * 900) + 100}`;
    const amount = Math.floor(Math.random() * 50000) + 5000;
    triggerDemoEvent({
      type: 'PAYMENT_FAILED',
      caseId,
      data: {
        amount,
        currency: 'INR',
        failureCode: 'BANK_TIMEOUT',
        detail: `₹${(amount / 100).toLocaleString('en-IN')} payment failed — ${caseId}`,
      },
    });
    // Simulate pipeline progression
    setTimeout(() => triggerDemoEvent({
      type: 'RECOVERY_CASE_CREATED',
      caseId,
      data: { amount, detail: `Recovery case created — ${caseId}` },
    }), 800);
    setTimeout(() => triggerDemoEvent({
      type: 'AGENT_STARTED',
      caseId,
      data: { agent: 'Detection Agent', detail: `Detection Agent analyzing ${caseId}` },
    }), 1800);
  }, [triggerDemoEvent]);

  const triggerRecovery = useCallback(() => {
    const caseId = 'RC-10291';
    const amount = 25000;
    triggerDemoEvent({
      type: 'POLICY_APPROVED',
      caseId,
      data: { detail: `Policy approved — all checks passed for ${caseId}` },
    });
    setTimeout(() => triggerDemoEvent({
      type: 'ACTION_STARTED',
      caseId,
      data: { action: 'Delayed Retry', detail: `Retry executing for ${caseId}` },
    }), 600);
    setTimeout(() => triggerDemoEvent({
      type: 'RECOVERY_SUCCESS',
      caseId,
      data: { amount, currency: 'INR', detail: `₹${(amount / 100).toLocaleString('en-IN')} recovered from ${caseId}` },
    }), 1400);
  }, [triggerDemoEvent]);

  const triggerPolicyBlock = useCallback(() => {
    const caseId = 'RC-10295';
    triggerDemoEvent({
      type: 'POLICY_BLOCKED',
      caseId,
      data: { reason: 'max_retries', detail: `Action blocked — max retries reached for ${caseId}` },
    });
  }, [triggerDemoEvent]);

  const triggerAgentEvent = useCallback(() => {
    triggerDemoEvent({
      type: 'AGENT_COMPLETED',
      caseId: 'RC-10294',
      data: { agent: 'Strategy Agent', strategy: 'SMS Nudge + UPI', probability: 0.74, detail: 'Strategy Agent completed analysis — SMS Nudge selected' },
    });
  }, [triggerDemoEvent]);

  return {
    triggerPaymentFailure,
    triggerRecovery,
    triggerPolicyBlock,
    triggerAgentEvent,
  };
}
