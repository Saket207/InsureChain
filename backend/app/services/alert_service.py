"""
InsureChain — Resend Email Alert Service
Sends automated email notifications to farmers in Marathi, Hindi, and English.
Uses Resend (https://resend.com) — free 3000 emails/month, 1 API key, zero config.

Setup:
  1. Go to https://resend.com and sign up (free)
  2. Copy your API key from the dashboard
  3. Set RESEND_API_KEY in backend/.env
  4. Done! That's it.
"""
import os
import logging
import requests as http_requests

logger = logging.getLogger(__name__)

# Subject mapping based on alert type
SUBJECTS = {
    'marathi': {
        'early_warning': '⚠️ InsureChain सूचना: धोका इशारा',
        'trigger_fired': '🔥 InsureChain: ट्रिगर सक्रिय',
        'payout_confirmed': '💸 InsureChain: पेआउट यशस्वी',
        'policy_expiry': '⏳ InsureChain: मुदत समाप्ती सूचना',
    },
    'hindi': {
        'early_warning': '⚠️ InsureChain चेतावनी: जोखिम अलर्ट',
        'trigger_fired': '🔥 InsureChain: ट्रिगर सक्रिय',
        'payout_confirmed': '💸 InsureChain: भुगतान सफल',
        'policy_expiry': '⏳ InsureChain: पॉलिसी समाप्ति चेतावनी',
    },
    'english': {
        'early_warning': '⚠️ InsureChain Early Warning: Weather Risk Alert',
        'trigger_fired': '🔥 InsureChain Trigger Activated: Payout Initiated',
        'payout_confirmed': '💸 InsureChain: Payout Successful',
        'policy_expiry': '⏳ InsureChain: Policy Expiration Alert',
    },
}

# Message templates per language and alert type
TEMPLATES = {
    'marathi': {
        'early_warning': 'InsureChain सूचना: {district} मध्ये {trigger_type}चा धोका वाढत आहे. ML विश्वास: {confidence}%',
        'trigger_fired': 'InsureChain: {trigger_type} ट्रिगर सक्रिय. ₹{amount} तुमच्या वॉलेटला पाठवले जात आहे.',
        'payout_confirmed': 'InsureChain: ₹{amount} यशस्वीरित्या मिळाले. Tx: {tx_hash}',
        'policy_expiry': 'InsureChain: तुमची पॉलिसी {days} दिवसांत संपेल. नूतनीकरण करा.',
    },
    'hindi': {
        'early_warning': 'InsureChain: {district} में {trigger_type} का खतरा बढ़ रहा है। ML विश्वास: {confidence}%',
        'trigger_fired': 'InsureChain: {trigger_type} ट्रिगर सक्रिय। ₹{amount} आपके वॉलेट में भेजा जा रहा है।',
        'payout_confirmed': 'InsureChain: ₹{amount} सफलतापूर्वक प्राप्त हुआ। Tx: {tx_hash}',
        'policy_expiry': 'InsureChain: आपकी पॉलिसी {days} दिनों में समाप्त होगी। नवीनीकरण करें।',
    },
    'english': {
        'early_warning': 'InsureChain Alert: {trigger_type} risk increasing in {district}. ML Confidence: {confidence}%',
        'trigger_fired': 'InsureChain: {trigger_type} trigger activated! ₹{amount} being sent to your wallet.',
        'payout_confirmed': 'InsureChain: ₹{amount} received successfully. Tx: {tx_hash}',
        'policy_expiry': 'InsureChain: Your policy expires in {days} days. Please renew.',
    },
}


def _resend_configured():
    """Check if Resend API key is set."""
    key = os.getenv('RESEND_API_KEY', '')
    return bool(key) and key != 'your_resend_api_key_here'


def send_email(to_email, subject, body_text, html_content=None):
    """
    Send an email via Resend API (https://resend.com).
    Free tier: 3000 emails/month. Just 1 API key needed.
    Returns True on success, False on failure.
    """
    if not _resend_configured():
        logger.info(
            f"\n{'='*50}\n"
            f"[📧 EMAIL LOG — Resend not configured]\n"
            f"To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Message: {body_text}\n"
            f"{'='*50}\n"
        )
        return False

    api_key = os.getenv('RESEND_API_KEY')
    sender = os.getenv('RESEND_FROM_EMAIL', 'InsureChain <onboarding@resend.dev>')

    try:
        email_payload = {
            'from': sender,
            'to': [to_email],
            'subject': subject,
        }
        if html_content:
            email_payload['html'] = html_content
        else:
            email_payload['text'] = body_text

        response = http_requests.post(
            'https://api.resend.com/emails',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json=email_payload,
            timeout=10,
        )

        if response.status_code in (200, 201):
            email_id = response.json().get('id', 'unknown')
            logger.info(f"✅ Resend email sent to {to_email} (ID: {email_id})")
            return True
        elif response.status_code == 403:
            # Resend free tier restriction – advise domain verification
            logger.error(
                f"❌ Resend 403 Forbidden: {response.text}.\n"
                "   To send emails to arbitrary recipients, verify a domain at resend.com/domains\n"
                "   and set RESEND_FROM_EMAIL to an address from that domain.\n"
                "   For now, emails are not dispatched in production."
            )
            return False
        else:
            logger.error(f"❌ Resend API error {response.status_code}: {response.text}")
            return False

    except Exception as e:
        logger.error(f"❌ Resend email send failed to {to_email}: {e}")
        return False


def _select_template(alert_type, language, data):
    """Select and format the appropriate message template."""
    lang_templates = TEMPLATES.get(language, TEMPLATES['english'])
    template = lang_templates.get(alert_type, TEMPLATES['english'].get(alert_type, ''))

    if not template:
        logger.warning(f"No template found for {alert_type}/{language}")
        return f"InsureChain Notification: {alert_type}"

    try:
        return template.format(**data)
    except KeyError as e:
        logger.warning(f"Template formatting error for {alert_type}: missing key {e}")
        safe_data = {
            'district': data.get('district', 'your district'),
            'trigger_type': data.get('trigger_type', 'weather'),
            'confidence': data.get('confidence', '0'),
            'amount': data.get('amount', '0'),
            'tx_hash': data.get('tx_hash', 'pending'),
            'days': data.get('days', '7'),
        }
        try:
            return template.format(**safe_data)
        except Exception:
            return f"InsureChain Alert: {alert_type} for {safe_data['district']}"


def send_alert(farmer_uid, alert_type, data):
    """
    Send an alert to a farmer via Resend Email, with terminal log fallbacks.

    Args:
        farmer_uid (str): Farmer's UID
        alert_type (str): One of 'early_warning', 'trigger_fired', 'payout_confirmed', 'policy_expiry'
        data (dict): Template variables (district, trigger_type, confidence, amount, etc.)

    Returns:
        dict: Result with delivery status
    """
    from app.services.firestore_service import get_farmer_profile, create_alert

    # Fetch farmer profile
    profile = get_farmer_profile(farmer_uid)
    
    # Defaults in case of missing profile
    email = ""
    language = "english"
    mobile = ""
    
    if profile:
        email = profile.get('email', '')
        language = profile.get('language', 'english').lower()
        mobile = profile.get('mobile', '')
    else:
        logger.warning(f"Farmer profile not found for UID {farmer_uid}. Using system defaults.")

    # Select fallback recipient from environment
    fallback_email = os.getenv('FALLBACK_RECIPIENT_EMAIL', '')
    recipient_email = email if email else fallback_email

    # Format message
    message = _select_template(alert_type, language, data)

    # Format subject
    lang_subjects = SUBJECTS.get(language, SUBJECTS['english'])
    subject = lang_subjects.get(alert_type, '🌾 InsureChain Smart Parametric Notification')

    result = {
        "farmer_uid": farmer_uid,
        "alert_type": alert_type,
        "message": message,
        "email_sent": False,
    }

    # Dispatch Email
    if recipient_email:
        result['email_sent'] = send_email(recipient_email, subject, message)
    else:
        logger.info(f"\n[EMAIL SKIPPED - NO RECIPIENT EMAIL SET]\nSubject: {subject}\nMessage: {message}\n")

    # Save alert record to Firestore for frontend Dashboard sync
    alert_record = {
        'farmerUid': farmer_uid,
        'type': alert_type,
        'message': message,
        'data': data,
        'channels': {
            'email': result['email_sent'],
            'terminal': True,
        },
    }
    create_alert(alert_record)

    logger.info(f"Alert '{alert_type}' registered for farmer {farmer_uid}: Email Sent={result['email_sent']}")
    return result
