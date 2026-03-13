"""
CryptoFlow Analyzer — Flask API
"""

import os
import re
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

from wallet_analyzer import analyze_transactions

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__)

# Allow the React dev server (and any other origin in development).
# In production, restrict origins to your actual frontend domain:
#   CORS(app, origins=["https://yourapp.example.com"])
CORS(app, origins="*")

ETHERSCAN_API_KEY = os.environ.get("ETHERSCAN_API_KEY", "")
ETHERSCAN_BASE_URL = "https://api.etherscan.io/api"

# Basic Ethereum address pattern (0x followed by 40 hex chars)
_ETH_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "CryptoFlow Analyzer"}), 200


@app.route("/analyze_wallet", methods=["POST"])
def analyze_wallet():
    """
    POST /analyze_wallet
    Body (JSON): { "wallet_address": "0x..." }

    Returns:
    {
        "wallet_address":          str,
        "total_transactions":      int,
        "suspicious_transactions": list[dict],
        "risk_score":              int,   // 0-100
        "transaction_flow":        list[dict]
    }
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body must be JSON"}), 400

    wallet_address = (body.get("wallet_address") or "").strip()

    # Input validation — reject anything that doesn't look like an ETH address
    if not wallet_address:
        return jsonify({"error": "wallet_address is required"}), 400

    if not _ETH_ADDRESS_RE.match(wallet_address):
        return jsonify({"error": "Invalid Ethereum wallet address format"}), 400

    if not ETHERSCAN_API_KEY:
        return jsonify({"error": "ETHERSCAN_API_KEY environment variable is not set"}), 500

    # Fetch transactions from Etherscan
    raw_transactions, fetch_error = _fetch_transactions(wallet_address)
    if fetch_error:
        return jsonify({"error": fetch_error}), 502

    # Run analysis
    analysis = analyze_transactions(raw_transactions)

    return jsonify({
        "wallet_address": wallet_address,
        "total_transactions": analysis["total_transactions"],
        "suspicious_transactions": analysis["suspicious_transactions"],
        "risk_score": analysis["risk_score"],
        "transaction_flow": analysis["transaction_flow"],
    }), 200


# ---------------------------------------------------------------------------
# Etherscan helper
# ---------------------------------------------------------------------------

def _fetch_transactions(address: str) -> tuple[list[dict], str | None]:
    """
    Fetch up to 10 000 normal transactions from Etherscan for `address`.
    Returns (transactions, error_message).  error_message is None on success.
    """
    params = {
        "module": "account",
        "action": "txlist",
        "address": address,
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": 10000,
        "sort": "asc",
        "apikey": ETHERSCAN_API_KEY,
    }

    try:
        resp = requests.get(ETHERSCAN_BASE_URL, params=params, timeout=15)
        resp.raise_for_status()
    except requests.exceptions.Timeout:
        return [], "Etherscan API request timed out"
    except requests.exceptions.RequestException as exc:
        return [], f"Etherscan API request failed: {exc}"

    data = resp.json()

    # Etherscan returns status "0" with message "No transactions found" for
    # valid addresses that simply have no history — treat that as empty, not error.
    if data.get("status") == "0":
        message = data.get("message", "")
        if "no transactions" in message.lower():
            return [], None
        return [], f"Etherscan error: {data.get('result', message)}"

    transactions = data.get("result", [])
    if not isinstance(transactions, list):
        return [], "Unexpected response format from Etherscan"

    return transactions, None


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
