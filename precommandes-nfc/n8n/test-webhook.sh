#!/usr/bin/env bash
# Envoie un événement de précommande factice au workflow n8n WF1.
# Usage : N8N_URL=... N8N_KEY=... TEST_EMAIL=... bash test-webhook.sh preorder.created
set -euo pipefail
EVENT="${1:-preorder.created}"
: "${N8N_URL:?Définir N8N_URL (URL du webhook)}"
: "${N8N_KEY:?Définir N8N_KEY (valeur de N8N_WEBHOOK_KEY)}"
EMAIL="${TEST_EMAIL:-test@example.com}"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
EVENT_ID="$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen)"

STATUS="pending_payment"; TX=null; REASON=null; PAID=3
case "$EVENT" in
  preorder.payment_submitted) STATUS="payment_submitted"; TX='"T_TEST123ABC"';;
  preorder.paid)              STATUS="paid"; TX='"T_TEST123ABC"'; PAID=10;;
  preorder.rejected)          STATUS="rejected"; TX='"T_TEST123ABC"'; REASON='"Transaction introuvable dans Wave Business"';;
  preorder.expired)           STATUS="expired";;
  preorder.cancelled)         STATUS="cancelled"; REASON='"Annulée à la demande du client"';;
esac

curl -sS -X POST "$N8N_URL" \
  -H "Content-Type: application/json" \
  -H "X-Portefolia-Key: $N8N_KEY" \
  -d @- <<JSON
{
  "event_id": "$EVENT_ID",
  "event": "$EVENT",
  "occurred_at": "$NOW",
  "preorder": {
    "id": 999, "reference": "PF-NFC-0999", "full_name": "Awa Diop", "first_name": "Awa",
    "card_name": "AWA DIOP", "email": "$EMAIL", "phone": "+221771234567", "city": "Dakar",
    "quantity": 1, "unit_price": 12500, "total_amount": 12500, "currency": "XOF",
    "status": "$STATUS", "wave_transaction_id": $TX, "wave_sender_phone": "+221771234567",
    "rejection_reason": $REASON, "client_reminder_count": 0,
    "payment_submitted_at": "$NOW", "paid_at": null, "created_at": "$NOW"
  },
  "payment": { "method": "wave", "wave_number": "+221 78 131 13 71", "wave_link": null },
  "stats": { "paid_count": $PAID, "batch_threshold": 10 },
  "links": {
    "tracking_url": "https://portefolia.tech/nfc/precommande/PF-NFC-0999?t=test",
    "admin_url": "https://portefolia.tech/admin/nfc-preorders?ref=PF-NFC-0999",
    "admin_list_url": "https://portefolia.tech/admin/nfc-preorders",
    "portfolio_url": "https://portefolia.tech/dashboard",
    "preorder_url": "https://portefolia.tech/nfc-types#precommande"
  }
}
JSON
echo
