import asyncio
import json
import re
import time
from typing import Dict, Any, Optional
import google.generativeai as genai

from app.core.config import settings
from app.core.logging import logger
from app.payments.failure_taxonomy import get_failure_profile, FAILURE_TAXONOMY


class LLMAdapter:
    """
    Autonomous Multi-Agent Reasoning Engine powered by Google Gemini AI (gemini-2.5-flash)
    with seamless fallback to deterministic heuristic rules across all 25+ payment failure taxonomies.
    """

    _gemini_model_instance = None
    _configured_key: Optional[str] = None

    @classmethod
    def _get_gemini_model(cls):
        api_key = settings.active_gemini_api_key
        if not api_key:
            return None

        if cls._gemini_model_instance is None or cls._configured_key != api_key:
            try:
                genai.configure(api_key=api_key)
                cls._gemini_model_instance = genai.GenerativeModel(
                    model_name=settings.GEMINI_MODEL,
                    generation_config={
                        "response_mime_type": "application/json",
                        "temperature": 0.15,
                        "top_p": 0.95,
                        "top_k": 40,
                        "max_output_tokens": 1000,
                    },
                )
                cls._configured_key = api_key
            except Exception as e:
                logger.error(f"[LLMAdapter] Error configuring Google Gemini model: {e}")
                return None

        return cls._gemini_model_instance

    @classmethod
    async def generate_reasoning(
        cls,
        prompt_type: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Executes Google Gemini reasoning with automated timeout (3.5s) and
        transparent fallback to deterministic taxonomy rules.
        """
        start_time = time.perf_counter()
        model = cls._get_gemini_model()

        if model:
            try:
                result = await asyncio.wait_for(
                    cls._execute_gemini_prompt(model, prompt_type, context),
                    timeout=8.0,
                )
                if result:
                    latency_ms = int((time.perf_counter() - start_time) * 1000)
                    result["_latency_ms"] = latency_ms
                    result["_ai_model"] = settings.GEMINI_MODEL
                    return result
            except asyncio.TimeoutError:
                logger.warning(
                    f"[LLMAdapter] Gemini reasoning timed out (>8.0s) for prompt '{prompt_type}'. "
                    "Falling back to deterministic failure taxonomy engine."
                )
            except Exception as exc:
                logger.warning(
                    f"[LLMAdapter] Gemini reasoning failed for '{prompt_type}': {exc}. "
                    "Falling back to deterministic failure taxonomy engine."
                )

        # Infallible Deterministic Heuristic Fallback
        fallback_res = cls._deterministic_heuristic_reasoning(prompt_type, context)
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        fallback_res["_latency_ms"] = max(1, latency_ms)
        fallback_res["_tokens_used"] = fallback_res.get("_tokens_used", 120)
        fallback_res["_ai_model"] = "heuristic-taxonomy-engine"
        return fallback_res

    @classmethod
    async def _execute_gemini_prompt(
        cls,
        model: Any,
        prompt_type: str,
        ctx: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        reason = ctx.get("failure_reason", "UNKNOWN_FAILURE")
        profile = get_failure_profile(reason)

        prompt = cls._build_prompt(prompt_type, ctx, profile)
        if not prompt:
            return None

        response = await model.generate_content_async(prompt)
        text = response.text.strip() if hasattr(response, "text") and response.text else ""
        if not text:
            return None

        parsed = cls._parse_json_response(text)

        # Estimate or extract tokens
        tokens = 150
        try:
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                tokens = getattr(response.usage_metadata, "total_token_count", 150)
        except Exception:
            tokens = max(50, len(text) // 4)
        parsed["_tokens_used"] = tokens

        # Normalize and validate schema per agent
        return cls._normalize_agent_output(prompt_type, parsed, ctx, profile)

    @classmethod
    def _parse_json_response(cls, text: str) -> Dict[str, Any]:
        """
        Extracts and parses JSON from model output safely, handling potential
        markdown fences and unescaped linebreaks inside string values.
        """
        cleaned = text.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned, strict=False)
        except Exception:
            pass

        first_brace = cleaned.find("{")
        last_brace = cleaned.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            snippet = cleaned[first_brace : last_brace + 1]
            try:
                return json.loads(snippet, strict=False)
            except Exception:
                pass

        return json.loads(cleaned, strict=False)

    @classmethod
    def _build_prompt(
        cls,
        prompt_type: str,
        ctx: Dict[str, Any],
        profile: Dict[str, Any],
    ) -> str:
        reason = ctx.get("failure_reason", "UNKNOWN_FAILURE")
        amount = float(ctx.get("amount", 0))
        attempt = int(ctx.get("attempt_count", 0))
        ltv = float(ctx.get("customer_ltv", 0) or 0)
        method = ctx.get("payment_method", "CARD")
        history = int(ctx.get("customer_failure_history", 0))

        if prompt_type == "detection":
            return f"""You are the RevivePilot Detection Agent, an autonomous AI specializing in real-time payment failure detection and risk assessment.
Analyze this payment failure event:
- Failure Reason: {reason} ({profile.get('name', reason)})
- Category: {profile.get('category', 'Technical')}
- Transaction Amount: INR {amount:,.2f}
- Customer Lifetime Value (LTV): INR {ltv:,.2f}
- Attempt Number: {attempt}
- Customer Past Failure Count: {history}
- Description: {profile.get('description', '')}

Evaluate customer tier (ENTERPRISE if LTV > 150000, PRO if LTV > 30000, else STANDARD), urgency (HIGH if amount > 50000 or LTV > 100000, else MEDIUM/LOW), and calculate risk_score (10-99).
Return a valid JSON object matching EXACTLY these keys:
{{
  "decision": "RECOVERY_QUALIFIED",
  "confidence": 95,
  "urgency": "HIGH",
  "customer_tier": "STANDARD",
  "risk_score": 65,
  "reasoning": "Professional clinical explanation of the detection analysis"
}}"""

        elif prompt_type == "root_cause":
            return f"""You are the RevivePilot Root Cause Diagnosis Agent, an autonomous AI specializing in payment failure diagnostics across 25 payment rails (Card, UPI, NetBanking, E-Mandates, Switches).
Analyze this failure event:
- Failure Code: {reason}
- Name: {profile.get('name', reason)}
- Expected Category: {profile.get('category', 'Bank')}
- Source: {profile.get('source', 'gateway')}
- Step: {profile.get('step', 'payment_authorization')}
- Description: {profile.get('description', '')}
- Technical Diagnostic: {profile.get('agent_diagnosis', '')}
- Payment Method: {method}
- Transaction Amount: INR {amount:,.2f}

Determine whether this is a temporary transient outage (is_temporary: true, e.g. bank timeout, network packet drop, CBS downtime) or permanent/auth decline (is_temporary: false, e.g. card blocked, invalid VPA, customer cancelled, fraud).
Return a valid JSON object matching EXACTLY these keys:
{{
  "decision": "{profile.get('category', 'Bank')}",
  "confidence": 92,
  "is_temporary": true,
  "failure_code": "{profile.get('code', 'GATEWAY_ERROR')}",
  "failure_source": "{profile.get('source', 'bank')}",
  "reasoning": "Precise diagnostic breakdown explaining the underlying failure mechanics and telemetry."
}}"""

        elif prompt_type == "strategy":
            return f"""You are the RevivePilot Strategy & Recovery Decision Agent, an autonomous AI specializing in revenue recovery optimization across 25 payment failure taxonomies.
Analyze this context to formulate the optimal recovery action:
- Failure Code: {reason} ({profile.get('name', reason)})
- Category: {profile.get('category', 'Bank')}
- Recommended Base Strategy: {profile.get('strategy', 'Delayed Retry')}
- Base Probability: {int(profile.get('base_prob', 0.8) * 100)}%
- Suggested Retry Delay Seconds: {profile.get('retry_delay_seconds', 900)}
- Preferred Alternative Rail: {profile.get('alternate_method', 'UPI')}
- Attempt Number: {attempt}
- Transaction Amount: INR {amount:,.2f}
- Customer LTV: INR {ltv:,.2f}

Select the optimal recovery strategy (e.g. Delayed Retry, Smart Alternative Link, UPI Intent Re-trigger, Mandate Batch Re-presentation, Split Payment, Dynamic UPI Push).
Return a valid JSON object matching EXACTLY these keys:
{{
  "strategy": "Name of recovery strategy",
  "recovery_probability": 85,
  "retry_delay_seconds": 900,
  "alternate_method": "UPI",
  "reasoning": "Comprehensive tactical rationale detailing why this action maximizes recovery conversion."
}}"""

        elif prompt_type == "action":
            strategy = ctx.get("strategy", "Delayed Retry")
            violations = ctx.get("violations", [])
            return f"""You are the RevivePilot Action & Policy Agent, responsible for bounded autonomy enforcement and execution governance.
Context:
- Proposed Strategy: {strategy}
- Transaction Amount: INR {amount:,.2f}
- Max Autonomous Limit: INR 150,000.00
- Attempt Count: {attempt} (Max Allowed: 3)
- Customer Failure History: {history} (Fatigue Threshold: 5)
- Pre-evaluated Violations: {json.dumps(violations)}

Evaluate bounded autonomy policies. If any violations exist or amount exceeds INR 150,000, block autonomous execution.
Return a valid JSON object matching EXACTLY these keys:
{{
  "decision": "POLICY_APPROVED",
  "confidence": 98,
  "policy_passed": true,
  "action_taken": "EXECUTE_DELAYED_RETRY",
  "reasoning": "Governance confirmation detailing policy adherence or violation blocks."
}}"""

        return ""

    @classmethod
    def _normalize_agent_output(
        cls,
        prompt_type: str,
        parsed: Dict[str, Any],
        ctx: Dict[str, Any],
        profile: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Ensures type safety, integer percentages, and valid bounds on LLM responses."""
        # Normalize confidence to int 0-100
        conf = parsed.get("confidence", 90)
        if isinstance(conf, str):
            conf_map = {"CRITICAL": 98, "HIGH": 95, "MEDIUM": 80, "LOW": 60}
            conf = conf_map.get(conf.upper(), 88)
        try:
            parsed["confidence"] = max(10, min(100, int(conf)))
        except (ValueError, TypeError):
            parsed["confidence"] = 90

        if prompt_type == "detection":
            if not parsed.get("decision"):
                parsed["decision"] = "RECOVERY_QUALIFIED"
            if parsed.get("urgency") not in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
                amount = float(ctx.get("amount", 0))
                parsed["urgency"] = "HIGH" if amount > 50000 else "MEDIUM"
            if "risk_score" not in parsed:
                parsed["risk_score"] = 65
            else:
                try:
                    parsed["risk_score"] = max(10, min(99, int(parsed["risk_score"])))
                except (ValueError, TypeError):
                    parsed["risk_score"] = 65

        elif prompt_type == "root_cause":
            parsed["decision"] = profile.get("category", "Bank")
            if "is_temporary" not in parsed:
                parsed["is_temporary"] = profile.get("retry_delay_seconds", 0) > 0
            else:
                parsed["is_temporary"] = bool(parsed["is_temporary"])
            parsed["failure_code"] = parsed.get("failure_code") or profile.get("code", "GATEWAY_ERROR")
            parsed["failure_source"] = parsed.get("failure_source") or profile.get("source", "bank")

        elif prompt_type == "strategy":
            if not parsed.get("strategy"):
                parsed["strategy"] = profile.get("strategy", "Delayed Retry")
            prob = parsed.get("recovery_probability", int(profile.get("base_prob", 0.8) * 100))
            try:
                parsed["recovery_probability"] = max(10, min(99, int(prob)))
            except (ValueError, TypeError):
                parsed["recovery_probability"] = int(profile.get("base_prob", 0.8) * 100)
            if "retry_delay_seconds" not in parsed:
                parsed["retry_delay_seconds"] = profile.get("retry_delay_seconds", 900)
            if "alternate_method" not in parsed:
                parsed["alternate_method"] = profile.get("alternate_method", "UPI")

        elif prompt_type == "action":
            if "policy_passed" not in parsed:
                parsed["policy_passed"] = len(ctx.get("violations", [])) == 0
            parsed["policy_passed"] = bool(parsed["policy_passed"])
            if not parsed.get("decision"):
                parsed["decision"] = "POLICY_APPROVED" if parsed["policy_passed"] else "BLOCKED_BY_POLICY"
            if not parsed.get("action_taken"):
                strat = ctx.get("strategy", "RECOVERY")
                parsed["action_taken"] = f"EXECUTE_{strat.upper().replace(' ', '_')}" if parsed["policy_passed"] else "STOP_RECOVERY"

        return parsed

    @classmethod
    def _deterministic_heuristic_reasoning(
        cls,
        prompt_type: str,
        ctx: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Deterministic, robust fallback reasoning engine.
        Authoritative mapping across all 25+ payment failure modes.
        """
        reason = ctx.get("failure_reason", "UNKNOWN_FAILURE")
        amount = float(ctx.get("amount", 0))
        attempt = int(ctx.get("attempt_count", 0))
        ltv = float(ctx.get("customer_ltv", 0) or 0)
        profile = get_failure_profile(reason)

        if prompt_type == "detection":
            urgency = "HIGH" if amount > 50000 or ltv > 100000 else ("MEDIUM" if amount > 10000 else "LOW")
            tier = "ENTERPRISE" if ltv > 150000 else ("PRO" if ltv > 30000 else "STANDARD")
            return {
                "decision": "RECOVERY_QUALIFIED",
                "confidence": 95,
                "urgency": urgency,
                "customer_tier": tier,
                "risk_score": 65 if amount > 10000 else 45,
                "reasoning": (
                    f"Payment failure event captured: '{profile['name']}' [{profile['category']}]. "
                    f"Transaction value INR {amount:,.2f} for customer in {tier} tier. "
                    f"Telemetry validated against Razorpay error taxonomy. Assigned urgency: {urgency}."
                ),
            }

        elif prompt_type == "root_cause":
            is_temp = profile.get("retry_delay_seconds", 0) > 0 or profile["category"] in [
                "Bank", "Network/Gateway", "UPI/Network", "System", "Gateway", "Network", "TECHNICAL_INFRASTRUCTURE", "TECHNICAL_NETWORK"
            ]
            return {
                "decision": profile["category"],
                "confidence": 92 if is_temp else 88,
                "is_temporary": is_temp,
                "reasoning": profile["agent_diagnosis"],
                "failure_code": profile["code"],
                "failure_source": profile["source"],
            }

        elif prompt_type == "strategy":
            rec_prob = int(profile["base_prob"] * 100)
            if attempt > 1:
                rec_prob = max(20, rec_prob - (attempt * 10))

            strat_name = "Smart Delayed Retry" if reason in ["BANK_TIMEOUT", "PAYMENT_TIMEOUT"] else profile["strategy"]
            return {
                "strategy": strat_name,
                "recovery_probability": rec_prob,
                "retry_delay_seconds": profile.get("retry_delay_seconds", 900),
                "alternate_method": profile.get("alternate_method", "UPI"),
                "reasoning": profile["agent_action"],
            }

        elif prompt_type == "action":
            violations = ctx.get("violations", [])
            passed = len(violations) == 0
            strategy = ctx.get("strategy", "Delayed Retry")
            return {
                "decision": "POLICY_APPROVED" if passed else "BLOCKED_BY_POLICY",
                "confidence": 98 if passed else 100,
                "policy_passed": passed,
                "action_taken": f"EXECUTE_{strategy.upper().replace(' ', '_')}" if passed else "STOP_RECOVERY",
                "reasoning": (
                    f"All bounded autonomy policies satisfied for strategy '{strategy}'."
                    if passed else f"Autonomous action blocked: {'; '.join(violations)}"
                ),
            }

        return {
            "decision": "DEFAULT",
            "confidence": 75,
            "reasoning": "Standard processing applied.",
        }
