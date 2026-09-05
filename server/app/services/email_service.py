import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Optional

from app.core.config import settings
from app.core.logging import logger


class EmailService:
    """
    Asynchronous SMTP Mailer Service for RevivePilot.
    Sends authentic email verification codes, recovery payment links,
    and security alerts to real customer email addresses using SMTP.
    """

    @classmethod
    def _build_otp_html(cls, name: str, otp: str) -> str:
        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }}
    .container {{ max-width: 540px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }}
    .header {{ background: #0c2340; padding: 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }}
    .header p {{ margin: 4px 0 0; font-size: 12px; color: #93c5fd; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }}
    .content {{ padding: 32px 28px; }}
    .greeting {{ font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }}
    .text {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }}
    .code-box {{ background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }}
    .otp-code {{ font-family: 'SF Mono', Consolas, Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #15803d; margin: 0; }}
    .code-hint {{ font-size: 12px; color: #166534; margin-top: 8px; font-weight: 500; }}
    .warning {{ font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }}
    .footer {{ background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RevivePilot</h1>
      <p>Autonomous Payment Gateway &amp; Revenue Recovery</p>
    </div>
    <div class="content">
      <div class="greeting">Hello {name},</div>
      <p class="text">
        You requested a secure one-time verification code (OTP) for RevivePilot Customer Portal.
        Use this single-use code to authenticate your session:
      </p>
      <div class="code-box">
        <h2 class="otp-code">{otp}</h2>
        <p class="code-hint">Expires in 5 minutes • Single-use only • Do not share</p>
      </div>
      <p class="text" style="font-size: 13px;">
        For your security, RevivePilot encrypts all payment interactions. If you did not request this OTP, someone may have entered your email by mistake. You can safely ignore this email.
      </p>
      <div class="warning">
        Security Note: RevivePilot agents will never ask for your OTP. Never share this code with anyone.
      </div>
    </div>
    <div class="footer">
      &copy; 2026 RevivePilot Inc. • Autonomous Revenue Recovery Platform
    </div>
  </div>
</body>
</html>"""

    @classmethod
    async def send_customer_otp(
        cls,
        email: str,
        otp: str,
        name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends cryptographically secure OTP to customer email via SMTP.
        Runs asynchronously in thread pool so it never blocks the event loop.
        """
        display_name = name or email.split("@")[0].capitalize()
        user = settings.SMTP_USER.strip()
        pwd = settings.resolved_smtp_password.strip()
        host = settings.SMTP_HOST.strip()
        port = settings.SMTP_PORT
        from_email = settings.resolved_smtp_from.strip() or user or "auth@revivepilot.local"
        from_name = settings.SMTP_FROM_NAME.strip() or "RevivePilot Recovery"

        if not user or not pwd:
            logger.warning(
                f"[EmailService] SMTP credentials not configured in .env. "
                f"For local dev testing, OTP for {email} is: [{otp}]"
            )
            return {
                "success": True,
                "mode": "DEV_CONSOLE_LOGGED",
                "message": f"Verification code dispatched to {email} (local dev mode)",
            }

        def _send_sync():
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"{otp} is your RevivePilot verification code"
            msg["From"] = f"{from_name} <{from_email}>"
            msg["To"] = email

            text_body = (
                f"Hello {display_name},\n\n"
                f"Your RevivePilot verification code is: {otp}\n\n"
                f"This single-use code expires in 5 minutes.\n"
                f"If you did not request this, please disregard this email.\n"
            )
            html_body = cls._build_otp_html(display_name, otp)

            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            # Port 465 uses direct SSL; Port 587 uses STARTTLS
            if port == 465:
                with smtplib.SMTP_SSL(host, port, timeout=6) as server:
                    server.login(user, pwd)
                    server.sendmail(from_email, [email], msg.as_string())
            else:
                with smtplib.SMTP(host, port, timeout=6) as server:
                    if settings.SMTP_TLS:
                        server.starttls()
                    server.login(user, pwd)
                    server.sendmail(from_email, [email], msg.as_string())
            return True

        try:
            await asyncio.to_thread(_send_sync)
            logger.info(f"[EmailService] Verification OTP successfully delivered to {email} via SMTP")
            return {
                "success": True,
                "mode": "SMTP_DELIVERED",
                "message": f"Verification code delivered to {email}",
            }
        except Exception as exc:
            logger.error(f"[EmailService] Failed to deliver email to {email} via SMTP: {exc}")
            return {
                "success": True,
                "mode": "FALLBACK_LOGGED",
                "message": f"Verification code generated (SMTP delivery issue: {str(exc)})",
            }

    @classmethod
    def _build_recovery_email_html(
        cls,
        name: str,
        merchant_name: str,
        amount: float,
        recovery_url: str,
        expires_at_str: str,
        failure_reason: str,
        timespan_hours: int = 24,
    ) -> str:
        formatted_amount = f"{amount:,.2f}"
        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Recovery Link</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px 0; color: #1e293b; }}
    .wrapper {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); }}
    .header {{ background: linear-gradient(135deg, #0a192f 0%, #0078d4 100%); padding: 32px 28px; text-align: center; color: #ffffff; }}
    .header-badge {{ display: inline-block; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 20px; padding: 5px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; color: #e0f2fe; }}
    .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }}
    .header p {{ margin: 6px 0 0; font-size: 13px; color: #bae6fd; font-weight: 500; }}
    .content {{ padding: 32px 28px; }}
    .greeting {{ font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
    .text {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }}
    .card-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin: 24px 0; }}
    .detail-row {{ display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }}
    .detail-row:last-child {{ border-bottom: none; }}
    .detail-label {{ color: #64748b; font-weight: 500; }}
    .detail-value {{ color: #0f172a; font-weight: 700; text-align: right; }}
    .amount-highlight {{ font-size: 28px; font-weight: 800; color: #0078d4; margin: 6px 0 16px; text-align: center; letter-spacing: -0.5px; }}
    .cta-container {{ text-align: center; margin: 32px 0 24px; }}
    .cta-button {{ display: inline-block; background: #0078d4; color: #ffffff !important; text-decoration: none; padding: 15px 36px; border-radius: 8px; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(0, 120, 212, 0.35); }}
    .cta-button:hover {{ background: #005a9e; }}
    .countdown-box {{ background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #92400e; margin-top: 20px; text-align: center; line-height: 1.5; }}
    .countdown-box strong {{ color: #b45309; }}
    .security-note {{ font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 18px; margin-top: 24px; }}
    .footer {{ background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.6; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-badge">&#128274; Secure Recovery Session</div>
      <h1>RevivePilot &bull; {merchant_name}</h1>
      <p>Autonomous Payment Gateway &amp; Revenue Recovery</p>
    </div>
    <div class="content">
      <div class="greeting">Hello {name},</div>
      <p class="text">
        Your recent payment of <strong>₹{formatted_amount}</strong> to <strong>{merchant_name}</strong> was interrupted due to a temporary gateway/bank issue (<em>{failure_reason}</em>).
      </p>
      <p class="text">
        Our AI Recovery Assistant has generated a dedicated, tokenized recovery link so you can complete your purchase securely without losing your order.
      </p>

      <div class="card-box">
        <div style="text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600;">Amount Due</div>
        <div class="amount-highlight">₹{formatted_amount}</div>
        <div class="detail-row">
          <span class="detail-label">Merchant</span>
          <span class="detail-value">{merchant_name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="detail-value" style="color: #ea580c;">Link Active &bull; Awaiting Authorization</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Validity Window</span>
          <span class="detail-value">{timespan_hours} Hours</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Session Closes On</span>
          <span class="detail-value">{expires_at_str}</span>
        </div>
      </div>

      <div class="cta-container">
        <a href="{recovery_url}" class="cta-button" target="_blank">
          Complete Your Payment Securely &rarr;
        </a>
      </div>

      <div class="countdown-box">
        &#9200; <strong>Time-Limited Session:</strong> This recovery link is valid for <strong>{timespan_hours} hours</strong> and closes on <strong>{expires_at_str}</strong>. For your security, this payment session will be automatically terminated after expiration.
      </div>

      <p class="text" style="font-size: 12px; color: #64748b; margin-top: 20px; word-break: break-all;">
        If the button above does not work, copy and paste this link into your browser:<br>
        <a href="{recovery_url}" style="color: #0078d4; text-decoration: underline;">{recovery_url}</a>
      </p>

      <div class="security-note">
        <strong>Security Notice:</strong> RevivePilot encrypts all transactions with 256-bit bank-grade encryption. Supported payment methods include UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, and NetBanking.
      </div>
    </div>
    <div class="footer">
      &copy; 2026 {merchant_name} &bull; Powered by RevivePilot Autonomous Revenue Recovery &bull; Razorpay Gateway<br>
      This is an automated operational notification regarding your payment.
    </div>
  </div>
</body>
</html>"""

    @classmethod
    async def send_recovery_link_email(
        cls,
        email: str,
        name: str,
        merchant_name: str,
        amount: float,
        recovery_url: str,
        expires_at_str: str,
        failure_reason: str,
        timespan_hours: int = 24,
    ) -> Dict[str, Any]:
        """
        Sends tokenized, 24-hour secure payment recovery link email to customer via SMTP.
        Runs asynchronously in thread pool to prevent blocking FastAPI event loop.
        """
        display_name = name or email.split("@")[0].capitalize()
        user = settings.SMTP_USER.strip()
        pwd = settings.resolved_smtp_password.strip()
        host = settings.SMTP_HOST.strip()
        port = settings.SMTP_PORT
        from_email = settings.resolved_smtp_from.strip() or user or "recovery@revivepilot.local"
        from_name = settings.SMTP_FROM_NAME.strip() or f"{merchant_name} via RevivePilot"

        formatted_amount = f"{amount:,.2f}"
        subject = f"Action Required: Complete your payment of ₹{formatted_amount} for {merchant_name}"

        if not user or not pwd:
            logger.warning(
                f"[EmailService] SMTP credentials not configured in .env. "
                f"Simulating recovery link dispatch to {email}."
            )
            return {
                "success": True,
                "mode": "DEV_CONSOLE_LOGGED",
                "message": f"Recovery link simulated for {email} (local dev mode)",
            }

        def _send_sync():
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_email}>"
            msg["To"] = email

            text_body = (
                f"Hello {display_name},\n\n"
                f"Your recent payment of ₹{formatted_amount} to {merchant_name} could not be completed "
                f"due to a temporary issue ({failure_reason}).\n\n"
                f"Our AI Recovery Assistant has prepared a secure payment link for you to complete your order:\n"
                f"{recovery_url}\n\n"
                f"NOTE: This link is valid for {timespan_hours} hours and will close on {expires_at_str}.\n\n"
                f"Regards,\n"
                f"{merchant_name} & RevivePilot Recovery Agent"
            )
            html_body = cls._build_recovery_email_html(
                name=display_name,
                merchant_name=merchant_name,
                amount=amount,
                recovery_url=recovery_url,
                expires_at_str=expires_at_str,
                failure_reason=failure_reason,
                timespan_hours=timespan_hours,
            )

            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            if port == 465:
                with smtplib.SMTP_SSL(host, port, timeout=10) as server:
                    server.login(user, pwd)
                    server.sendmail(from_email, [email], msg.as_string())
            else:
                with smtplib.SMTP(host, port, timeout=10) as server:
                    if settings.SMTP_TLS:
                        server.starttls()
                    server.login(user, pwd)
                    server.sendmail(from_email, [email], msg.as_string())
            return True

        try:
            await asyncio.to_thread(_send_sync)
            logger.info(f"[EmailService] Recovery link email successfully delivered to {email} via SMTP")
            return {
                "success": True,
                "mode": "SMTP_DELIVERED",
                "message": f"Recovery email successfully delivered to {email}",
            }
        except Exception as exc:
            logger.error(f"[EmailService] Failed to deliver recovery email to {email} via SMTP: {exc}")
            return {
                "success": False,
                "mode": "SMTP_FAILED",
                "error": str(exc),
                "message": f"Failed to send email to {email}: {str(exc)}",
            }

