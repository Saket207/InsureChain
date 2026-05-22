"""
InsureChain — Risk Score & Premium Routes
"""
import os
import logging
from flask import Blueprint, request, jsonify
import requests as http_requests
from app import limiter

logger = logging.getLogger(__name__)
risk_bp = Blueprint('risk', __name__)

BASE_RATE_INR = 500
COVERAGE_MULTIPLIERS = {0: 0, 1: 1.0, 2: 1.3, 3: 1.5, 4: 1.8, 5: 2.0, 6: 2.2, 7: 2.4, 8: 2.6}

def _fetch_eth_inr_price():
    try:
        resp = http_requests.get(
            'https://api.coingecko.com/api/v3/simple/price',
            params={'ids': 'ethereum', 'vs_currencies': 'inr'},
            timeout=10,
        )
        return resp.json().get('ethereum', {}).get('inr', 280000)
    except Exception:
        return 280000

from app.services.alert_service import send_email

@risk_bp.route('/api/send-welcome-email', methods=['POST'])
def send_welcome_email():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing payload"}), 400
            
        email = data.get('email')
        if not email:
            return jsonify({"error": "Missing email"}), 400
            
        # HACKATHON FIX: Always route to verified fallback email
        fallback = os.getenv('FALLBACK_RECIPIENT_EMAIL', '')
        actual_recipient = fallback if fallback else email
        
        subject = "🌾 Welcome to InsureChain!"
        html_content = f"""
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid #f1f5f9;">
            
            <!-- Header Gradient -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 48px 32px; text-align: center; position: relative; overflow: hidden;">
                <!-- Decorative Circle -->
                <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(52, 211, 153, 0.15) 0%, rgba(52, 211, 153, 0) 70%); border-radius: 50%;"></div>
                
                <div style="display: inline-block; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 20px;">
                    <span style="font-size: 32px;">🌱</span>
                </div>
                
                <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -1px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">Welcome to InsureChain</h1>
                <p style="margin: 12px 0 0 0; color: #34d399; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Decentralized Agritech Platform</p>
            </div>
            
            <!-- Body Content -->
            <div style="padding: 40px 32px; background-color: #ffffff; color: #334155;">
                <h2 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 700; color: #0f172a; text-align: center;">Your Farm Node is Active!</h2>
                
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569; text-align: center;">Hello <b>{email}</b>,<br>You have successfully registered on the world's first autonomous parametric crop insurance network.</p>
                
                <!-- Action Card -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 32px; text-align: center;">
                    <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: #0f172a;">Next Steps to Secure Your Harvest</h3>
                    
                    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px;">
                        <span style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">1</span>
                        <span style="font-size: 14px; color: #475569;">Connect your Web3 Wallet</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px;">
                        <span style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">2</span>
                        <span style="font-size: 14px; color: #475569;">Select your Farm Location</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                        <span style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">3</span>
                        <span style="font-size: 14px; color: #475569;">Deploy a Smart Contract Policy</span>
                    </div>
                </div>
                
                <!-- Call to Action -->
                <div style="text-align: center;">
                    <a href="http://localhost:5173/dashboard" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(15, 23, 42, 0.2);">Access Dashboard</a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-weight: 600;">InsureChain Web3 Foundation</p>
                <p style="margin: 6px 0 0 0;">Zero Middlemen • Transparent Risk Oracles • Instant Payouts</p>
            </div>
        </div>
        """
        body_text = f"Welcome to InsureChain! Your account {email} is active."
        
        email_sent = send_email(actual_recipient, subject, body_text, html_content=html_content)
        
        return jsonify({"success": True, "email_sent": email_sent}), 200
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
        return jsonify({"error": str(e)}), 500

@risk_bp.route('/api/delete-farmer/<uid>', methods=['DELETE'])
def delete_farmer(uid):
    """HACKATHON FIX: Force delete a farmer profile bypassing client-side Firestore rules."""
    try:
        from firebase_admin import firestore, auth
        db = firestore.client()
        # Delete from Firestore
        db.collection('farmers').document(uid).delete()
        
        # Delete from Firebase Auth if exists
        try:
            auth.delete_user(uid)
        except Exception as auth_e:
            logger.warning(f"Auth user not found or could not delete: {auth_e}")
            
        return jsonify({"success": True, "message": "Farmer forcefully deleted."}), 200
    except Exception as e:
        logger.error(f"Error forcefully deleting farmer {uid}: {e}")
        return jsonify({"error": str(e)}), 500

@risk_bp.route('/api/risk-scores', methods=['GET'])
def get_all_risk_scores():
    try:
        from app.services.firestore_service import get_all_district_risk_scores
        scores = get_all_district_risk_scores()
        return jsonify({"scores": scores, "count": len(scores)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@risk_bp.route('/api/risk-scores/<district>', methods=['GET'])
def get_district_risk(district):
    try:
        lat = request.args.get('lat')
        lon = request.args.get('lon')
        
        from app.services.firestore_service import get_district_risk_score
        
        # If coordinates provided, ALWAYS bypass cache for live data
        if not (lat and lon):
            score = get_district_risk_score(district)
            if score:
                # Add transparency if missing from old cache
                if 'transparency' not in score:
                    s = score.get('riskScore', 50)
                    score['transparency'] = {
                        'drought_impact': f"{round(s * 0.30)}%",
                        'flood_impact': f"{round(s * 0.20)}%",
                        'satellite_impact': f"{round(s * 0.25)}%",
                        'weather_impact': f"{round(s * 0.25)}%"
                    }
                return jsonify(score), 200

        # Compute Live
        from ml.risk_model.risk_scorer import compute_district_risk_score
        from config import Config
        
        if not lat or not lon:
            district_data = next((d for d in Config.DISTRICTS if d['id'] == district.lower()), None)
            if district_data:
                lat, lon = district_data['lat'], district_data['lon']
            else:
                lat, lon = 21.1458, 79.0882 # Fallback
        
        result = compute_district_risk_score(district, float(lat), float(lon))
        
        # Fix int64 JSON serialization error
        if 'riskScore' in result and hasattr(result['riskScore'], 'item'):
            result['riskScore'] = result['riskScore'].item()
            
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error in get_district_risk: {e}")
        return jsonify({"error": str(e)}), 500

@risk_bp.route('/api/premium-calculate', methods=['GET'])
def calculate_premium():
    district = request.args.get('district')
    if not district:
        return jsonify({"error": "Missing 'district' query parameter"}), 400
        
    triggers_str = request.args.get('triggers', '')
    triggers = [t.strip() for t in triggers_str.split(',') if t.strip()]
    season = request.args.get('season', 'Kharif')
    
    try:
        from app.services.firestore_service import get_district_risk_score
        score_data = get_district_risk_score(district)
        risk_multiplier = score_data.get('riskMultiplier', 1.4) if score_data else 1.4
        
        season_factor = 1.2 if season == 'Kharif' else 1.0
        coverage_multiplier = COVERAGE_MULTIPLIERS.get(len(triggers), 1.0)
        
        total_premium_inr = round(BASE_RATE_INR * risk_multiplier * season_factor * coverage_multiplier)
        eth_price = _fetch_eth_inr_price()
        
        return jsonify({
            "total_premium_inr": total_premium_inr,
            "total_premium_eth": round(total_premium_inr / eth_price, 6),
            "coverage_inr": total_premium_inr * 10,
            "breakdown": {
                "base_rate": BASE_RATE_INR,
                "risk_multiplier": round(risk_multiplier, 2),
                "season_factor": season_factor,
                "coverage_multiplier": coverage_multiplier
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@risk_bp.route('/api/send-policy-email', methods=['POST'])
def send_policy_email():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing payload"}), 400
            
        email = data.get('email')
        if not email:
            return jsonify({"error": "Missing email"}), 400
            
        # HACKATHON FIX: Always route to verified fallback email to prevent Resend Free Tier 403 blocks
        fallback = os.getenv('FALLBACK_RECIPIENT_EMAIL', '')
        actual_recipient = fallback if fallback else email
            
        policy_id = data.get('policyId', 'N/A')
        fullName = data.get('fullName', 'Farmer')
        district = data.get('district', 'N/A')
        state = data.get('state', 'N/A')
        season = data.get('season', 'N/A')
        triggers = data.get('triggers', [])
        premium_inr = data.get('premiumINR', 0)
        premium_eth = data.get('premiumETH', 0.0)
        coverage_inr = data.get('coverageINR', 0)
        tx_hash = data.get('txHash', 'N/A')
        wallet_address = data.get('walletAddress', 'N/A')
        
        trigger_str = ", ".join([t.upper() for t in triggers])
        
        subject = f"🌾 InsureChain: Policy Registration Success ({policy_id})"
        
        html_content = f"""
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid #f1f5f9;">
            
            <!-- Dynamic Header -->
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 48px 32px; text-align: center; position: relative;">
                <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 30px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.3);">
                    <span style="color: white; font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">Smart Contract Deployed</span>
                </div>
                <h1 style="margin: 0; font-size: 36px; font-weight: 800; color: #ffffff; letter-spacing: -1px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">Node Activated!</h1>
            </div>
            
            <!-- Body Content -->
            <div style="padding: 40px 32px; background-color: #ffffff;">
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">Dear <b style="color: #0f172a;">{fullName}</b>,<br>Your parametric crop insurance policy has been successfully verified, cryptographically signed, and broadcasted to the <b>Ethereum Sepolia Testnet</b>.</p>
                
                <!-- Premium Data Card -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; margin-bottom: 32px;">
                    <div style="background: #0f172a; padding: 16px 20px;">
                        <h3 style="margin: 0; font-size: 13px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">Blockchain Policy Receipt</h3>
                    </div>
                    <div style="padding: 24px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr style="border-bottom: 1px dashed #cbd5e1;">
                                <td style="padding: 12px 0; color: #64748b; font-weight: 600;">Policy ID</td>
                                <td style="padding: 12px 0; text-align: right; color: #0f172a; font-weight: 800; font-family: monospace; font-size: 15px;">{policy_id}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #cbd5e1;">
                                <td style="padding: 12px 0; color: #64748b; font-weight: 600;">Farm Location</td>
                                <td style="padding: 12px 0; text-align: right; color: #0f172a; font-weight: 700;">{district}, {state}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #cbd5e1;">
                                <td style="padding: 12px 0; color: #64748b; font-weight: 600;">Monitored Calamities</td>
                                <td style="padding: 12px 0; text-align: right; color: #059669; font-weight: 800; text-transform: uppercase; font-size: 12px;">{trigger_str}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 12px 0; color: #64748b; font-weight: 600;">Premium Locked</td>
                                <td style="padding: 12px 0; text-align: right; color: #0f172a; font-weight: 800;">₹{premium_inr:,} <span style="color: #94a3b8; font-size: 12px;">(≈ {premium_eth:.6f} ETH)</span></td>
                            </tr>
                            <tr>
                                <td style="padding: 16px 0 0 0; color: #0f172a; font-weight: 800; font-size: 16px;">Max Autonomous Payout</td>
                                <td style="padding: 16px 0 0 0; text-align: right; color: #059669; font-weight: 900; font-size: 20px;">₹{coverage_inr:,}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Transaction Hash Box -->
                <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 32px; text-align: center; border: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; display: inline-block;"></span>
                        <p style="margin: 0; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Tx Hash Verified</p>
                    </div>
                    <p style="margin: 0; color: #0f172a; font-family: monospace; font-size: 12px; word-break: break-all; background: white; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1;">{tx_hash}</p>
                </div>

                <div style="text-align: center; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #92400e;"><b>Automated Monitoring Active:</b> If satellite indices (NDVI) or regional weather parameters cross the critical threshold, your payout will be dispatched automatically to <span style="font-family: monospace; background: white; padding: 2px 6px; border-radius: 4px;">{wallet_address}</span>.</p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #0f172a; padding: 32px; text-align: center; color: #94a3b8;">
                <p style="margin: 0; font-size: 14px; font-weight: 700; color: white;">InsureChain</p>
                <p style="margin: 8px 0 0 0; font-size: 12px;">Decentralized Weather Oracles • Zero Middlemen • Instant Payouts</p>
            </div>
        </div>
        """
        
        body_text = f"Dear {fullName}, your policy {policy_id} for {district}, {state} is registered successfully. Premium paid: INR {premium_inr} (≈ {premium_eth} ETH), Coverage: INR {coverage_inr}. Tx: {tx_hash}."
        
        from app.services.alert_service import send_email
        email_sent = send_email(actual_recipient, subject, body_text, html_content=html_content)
        
        return jsonify({"success": True, "email_sent": email_sent}), 200
    except Exception as e:
        logger.error(f"Error sending registration email: {e}")
        return jsonify({"error": str(e)}), 500

@risk_bp.route('/api/mock-trigger', methods=['POST'])
def mock_trigger():
    import os
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing payload"}), 400
            
        policy_id = data.get('policyId')
        trigger_type = data.get('triggerType', 'weather')
        
        if not policy_id:
            return jsonify({"error": "Missing policyId"}), 400
            
        from app.services.firebase_init import get_db
        db = get_db()
        if not db:
            return jsonify({"error": "Firebase not connected"}), 500
            
        # Try finding the policy by document ID
        policy_ref = db.collection('policies').document(policy_id)
        policy_doc = policy_ref.get()
        
        if not policy_doc.exists:
            # Try searching by policyId field
            from google.cloud.firestore_v1 import FieldFilter
            docs = (
                db.collection('policies')
                .where(filter=FieldFilter('policyId', '==', policy_id))
                .limit(1)
                .stream()
            )
            doc_list = list(docs)
            if doc_list:
                policy_ref = db.collection('policies').document(doc_list[0].id)
                policy_doc = doc_list[0]
            else:
                return jsonify({"error": f"Policy {policy_id} not found"}), 404
                
        policy_data = policy_doc.to_dict()
        
        # 1. Compute payout amount in INR
        from datetime import datetime, timezone
        mock_tx_hash = f"0x{os.urandom(32).hex()}"
        
        # Prefer coverageINR (stored in ₹), fallback to premiumINR*10, then coverageAmount
        coverage_inr = policy_data.get('coverageINR', 0)
        if not coverage_inr:
            premium_inr = policy_data.get('premiumINR', 0)
            if premium_inr:
                coverage_inr = float(premium_inr) * 10
            else:
                coverage_amount = policy_data.get('coverageAmount', 0)
                try:
                    coverage_inr = float(coverage_amount)
                    # If it looks like ETH (< 1), convert to INR
                    if coverage_inr < 100:
                        coverage_inr = coverage_inr * 280000
                except Exception:
                    coverage_inr = 5000.0
        
        coverage_inr = float(coverage_inr)
        gas_fee_inr = round(coverage_inr * 0.005) or 15  # ~0.5% gas estimate
        
        # Trigger labels for readable descriptions
        trigger_labels = {
            'drought': 'drought condition',
            'flood': 'flood disaster',
            'heatwave': 'extreme heatwave',
            'frost': 'frost damage',
            'pest': 'pest infestation',
            'hail': 'hailstorm damage',
            'unseasonal_rain': 'unseasonal rainfall',
            'cyclone': 'cyclone event',
        }
        trigger_desc = trigger_labels.get(trigger_type, trigger_type)
        district = policy_data.get('district', 'Nagpur')
            
        payout_item = {
            "amount": coverage_inr,
            "amountINR": coverage_inr,
            "gasFeeINR": gas_fee_inr,
            "date": datetime.now(timezone.utc).isoformat(),
            "trigger": trigger_type,
            "txHash": mock_tx_hash
        }
        
        # Get existing history
        payout_history = policy_data.get('payoutHistory', [])
        payout_history.append(payout_item)
        
        trigger_confidence = policy_data.get('triggerConfidence', {})
        trigger_confidence[trigger_type] = 100
        
        policy_ref.update({
            'status': 'PaidOut',
            'payoutHistory': payout_history,
            'triggerConfidence': trigger_confidence,
            'txHash': mock_tx_hash,
            'updatedAt': datetime.now(timezone.utc)
        })
        
        # 2. Add alerts to Firestore
        farmer_uid = policy_data.get('farmerUid', 'unknown')
        
        # Create trigger fired alert
        alert_fired = {
            'farmerUid': farmer_uid,
            'type': 'trigger_fired',
            'message': f"InsureChain: {trigger_type.upper()} trigger activated! ₹{coverage_inr:,.0f} payout for {trigger_desc} initiated.",
            'createdAt': datetime.now(timezone.utc),
            'isRead': False,
            'data': {
                'district': district,
                'trigger_type': trigger_type,
                'amount': coverage_inr,
                'amountINR': coverage_inr
            }
        }
        db.collection('alerts').add(alert_fired)
        
        # Create payout confirmed alert
        alert_payout = {
            'farmerUid': farmer_uid,
            'type': 'payout_confirmed',
            'message': f"InsureChain: ₹{coverage_inr:,.0f} disbursed as crop protection incentive for {trigger_desc} in {district}. Gas fee: ≈₹{gas_fee_inr:,}. Tx: {mock_tx_hash[:14]}...",
            'createdAt': datetime.now(timezone.utc),
            'isRead': False,
            'data': {
                'amount': coverage_inr,
                'amountINR': coverage_inr,
                'gasFeeINR': gas_fee_inr,
                'tx_hash': mock_tx_hash
            }
        }
        db.collection('alerts').add(alert_payout)
        
        # 3. Send enhanced email to farmer via Resend
        from app.services.alert_service import send_email
        email = policy_data.get('email', '')
        fallback_email = os.getenv('FALLBACK_RECIPIENT_EMAIL', '')
        
        # HACKATHON FIX: Always route to verified fallback email to prevent Resend Free Tier 403 blocks
        recipient_email = fallback_email if fallback_email else email
        
        farmer_name = policy_data.get('fullName', policy_data.get('farmerName', 'Farmer'))
        wallet_address = policy_data.get('walletAddress', 'N/A')
        season = policy_data.get('season', 'Kharif')
        
        email_sent = False
        if recipient_email:
            subject = f"💸 InsureChain: ₹{coverage_inr:,.0f} Autonomous Payout Disbursed — {trigger_desc.title()} ({policy_id})"
            
            html_content = f"""
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">💸 INSURECHAIN</h1>
                    <p style="margin: 8px 0 0 0; color: #f43f5e; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">AUTONOMOUS PAYOUT DISBURSED</p>
                </div>
                <div style="padding: 32px; background-color: white; color: #334155;">
                    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #059669;">₹{coverage_inr:,.0f} Payout Confirmed!</h2>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.7; color: #64748b;">
                        Dear <b>{farmer_name}</b>, our decentralized oracle weather monitoring system has detected that the 
                        parametric threshold for <b style="color: #e11d48; text-transform: uppercase;">{trigger_desc}</b> has been 
                        breached in <b>{district}</b> district during the <b>{season}</b> season. As per your InsureChain smart contract, 
                        an autonomous payout has been instantly discharged — <b>no claims process required</b>.
                    </p>
                    
                    <!-- Payout Amount Highlight -->
                    <div style="background: linear-gradient(135deg, #059669, #10b981); border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
                        <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Total Payout Amount</p>
                        <p style="margin: 4px 0 0 0; color: white; font-size: 36px; font-weight: 900;">₹{coverage_inr:,.0f}</p>
                        <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 600;">Crop Protection Incentive for {trigger_desc.title()}</p>
                    </div>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 14px 0; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px;">Transaction Receipt</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Policy ID</td>
                                <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 800;">{policy_id}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Farmer</td>
                                <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 700;">{farmer_name}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">District</td>
                                <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 700;">{district}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Trigger Event</td>
                                <td style="padding: 10px 0; text-align: right; color: #e11d48; font-weight: 800; text-transform: uppercase;">{trigger_desc}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Confidence Score</td>
                                <td style="padding: 10px 0; text-align: right; color: #e11d48; font-weight: 800;">100%</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Payout Amount</td>
                                <td style="padding: 10px 0; text-align: right; color: #059669; font-weight: 900; font-size: 16px;">₹{coverage_inr:,.0f}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Est. Gas Fee</td>
                                <td style="padding: 10px 0; text-align: right; color: #d97706; font-weight: 700;">≈ ₹{gas_fee_inr:,}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Wallet</td>
                                <td style="padding: 10px 0; text-align: right; color: #0f172a; font-family: monospace; font-size: 11px;">{wallet_address}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background-color: #0f172a; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
                        <p style="margin: 0; color: white; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Blockchain Transaction Hash</p>
                        <p style="margin: 6px 0 0 0; color: #94a3b8; font-family: monospace; font-size: 10px; word-break: break-all;">{mock_tx_hash}</p>
                    </div>

                    <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                        <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #065f46; font-weight: 600;">
                            ✅ ₹{coverage_inr:,.0f} has been disbursed as crop protection incentive to farmer <b>{farmer_name}</b> for 
                            <b>{trigger_desc}</b> in <b>{district}</b>. This autonomous payout was triggered by InsureChain's 
                            parametric oracle system — no claims process required. Estimated network gas fee: ≈₹{gas_fee_inr:,}.
                        </p>
                    </div>
                    
                    <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #94a3b8; text-align: center;">The funds have been transferred directly to your wallet. No claims process was required.</p>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0;">InsureChain © 2026 — Decentralized Crop Insurance on Blockchain</p>
                    <p style="margin: 4px 0 0 0;">Zero Middlemen • Satellite Oracles • Instant Payouts</p>
                </div>
            </div>
            """
            body_text = (
                f"Dear {farmer_name}, ₹{coverage_inr:,.0f} has been disbursed as crop protection incentive "
                f"for {trigger_desc} in {district}. Policy: {policy_id}. "
                f"Gas fee: ≈₹{gas_fee_inr:,}. Tx: {mock_tx_hash}. "
                f"This autonomous payout was triggered by InsureChain — no claims required."
            )
            email_sent = send_email(recipient_email, subject, body_text, html_content=html_content)
            
        return jsonify({
            "success": True, 
            "status": "PaidOut", 
            "txHash": mock_tx_hash,
            "amountINR": coverage_inr,
            "gasFeeINR": gas_fee_inr,
            "email_sent": email_sent
        }), 200
        
    except Exception as e:
        logger.error(f"Error executing mock trigger: {e}")
        return jsonify({"error": str(e)}), 500
