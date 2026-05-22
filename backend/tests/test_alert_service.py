"""
Tests for Resend email alert service.
"""
import pytest
from unittest.mock import patch, MagicMock

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.alert_service import (
    send_email,
    send_alert,
    _select_template,
    TEMPLATES,
)


class TestTemplates:
    def test_all_languages_have_all_types(self):
        alert_types = ['early_warning', 'trigger_fired', 'payout_confirmed', 'policy_expiry']
        for lang in ['marathi', 'hindi', 'english']:
            for alert_type in alert_types:
                assert alert_type in TEMPLATES[lang], f"Missing {alert_type} in {lang}"

    def test_english_early_warning_template(self):
        msg = _select_template('early_warning', 'english', {
            'district': 'Nagpur',
            'trigger_type': 'drought',
            'confidence': '85',
        })
        assert 'InsureChain' in msg
        assert 'Nagpur' in msg
        assert 'drought' in msg
        assert '85' in msg

    def test_hindi_trigger_fired_template(self):
        msg = _select_template('trigger_fired', 'hindi', {
            'trigger_type': 'flood',
            'amount': '50000',
        })
        assert 'InsureChain' in msg
        assert 'flood' in msg
        assert '50000' in msg

    def test_marathi_payout_template(self):
        msg = _select_template('payout_confirmed', 'marathi', {
            'amount': '25000',
            'tx_hash': '0xabc123',
        })
        assert '25000' in msg
        assert '0xabc123' in msg

    def test_unknown_type_returns_fallback(self):
        msg = _select_template('unknown_type', 'english', {})
        assert 'InsureChain' in msg

    def test_missing_data_uses_defaults(self):
        msg = _select_template('early_warning', 'english', {})
        assert isinstance(msg, str)
        assert len(msg) > 0


class TestSendEmail:
    @patch.dict(os.environ, {'RESEND_API_KEY': ''})
    def test_logs_only_without_api_key(self):
        result = send_email('farmer@example.com', 'Subject', 'Test body')
        assert result is False

    @patch('app.services.alert_service.http_requests.post')
    @patch.dict(os.environ, {'RESEND_API_KEY': 're_test_key_123'})
    def test_sends_with_valid_api_key(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'id': 'email_123'}
        mock_post.return_value = mock_response

        result = send_email('farmer@example.com', 'Subject', 'Test body')
        
        assert result is True
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args[0][0] == 'https://api.resend.com/emails'
        assert 'Bearer re_test_key_123' in call_args[1]['headers']['Authorization']

    @patch('app.services.alert_service.http_requests.post')
    @patch.dict(os.environ, {'RESEND_API_KEY': 're_test_key_123'})
    def test_handles_api_error(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 422
        mock_response.text = 'Invalid email'
        mock_post.return_value = mock_response

        result = send_email('bad-email', 'Subject', 'Test body')
        assert result is False


class TestSendAlert:
    @patch('app.services.firestore_service.get_farmer_profile')
    @patch('app.services.firestore_service.create_alert')
    @patch('app.services.alert_service.send_email')
    def test_send_alert_flow(self, mock_send_email, mock_create_alert, mock_get_profile):
        mock_get_profile.return_value = {
            'email': 'farmer@example.com',
            'language': 'english',
            'mobile': '+919876543210'
        }
        mock_send_email.return_value = True

        data = {
            'district': 'Nagpur',
            'trigger_type': 'drought',
            'confidence': '85',
            'amount': '10000',
        }

        result = send_alert('farmer_123', 'early_warning', data)

        assert result['farmer_uid'] == 'farmer_123'
        assert result['email_sent'] is True
        mock_send_email.assert_called_once()
        mock_create_alert.assert_called_once()
