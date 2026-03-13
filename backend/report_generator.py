"""AI-style investigation report generator for suspicious blockchain wallets."""

from __future__ import annotations


def _risk_label(risk_score: float) -> str:
    if risk_score > 70:
        return "High Risk"
    if risk_score >= 40:
        return "Medium Risk"
    return "Low Risk"


def _possible_pattern(
    suspicious_tx: int,
    unknown_wallets: int,
    total_volume: float,
) -> str:
    # Build a compact behavior profile based on observed wallet traits.
    if suspicious_tx > 10 and unknown_wallets > 5 and total_volume > 10:
        return (
            "Likely layered laundering behavior with rapid fund movement across "
            "multiple unknown counterparties and unusually high volume."
        )
    if suspicious_tx > 10 and total_volume > 10:
        return "Potential rapid-distribution or wash-transfer activity."
    if unknown_wallets > 5 and total_volume > 10:
        return "Broad distribution pattern to unverified wallets with elevated value transfer."
    if suspicious_tx > 10:
        return "Rapid transaction cycling pattern."
    if unknown_wallets > 5:
        return "Network expansion toward unverified counterparties."
    if total_volume > 10:
        return "High-value movement pattern requiring closer monitoring."
    return "No dominant criminal pattern identified; continue routine monitoring."


def _recommendation(risk_score: float) -> str:
    if risk_score > 70:
        return (
            "Escalate immediately: freeze/monitor associated flows, run enhanced due diligence, "
            "and prepare evidence package for compliance/legal review."
        )
    if risk_score >= 40:
        return (
            "Maintain active monitoring: increase alert sensitivity, review counterparties, "
            "and perform periodic reassessment."
        )
    return "Keep under standard monitoring and re-evaluate if new suspicious indicators emerge."


def generate_investigation_report(
    wallet_address: str,
    risk_score: float,
    suspicious_tx: int,
    unknown_wallets: int,
    total_volume: float,
) -> str:
    """Generate a formatted AI-style investigation report for a wallet."""
    risk_class = _risk_label(risk_score)

    reasons: list[str] = []
    if suspicious_tx > 10:
        reasons.append("Rapid transaction bursts detected (suspicious_tx > 10).")
    if unknown_wallets > 5:
        reasons.append("Frequent interaction with unknown wallets (unknown_wallets > 5).")
    if total_volume > 10:
        reasons.append("High transaction volume observed (total_volume > 10 ETH).")
    if not reasons:
        reasons.append("No threshold-based red flags were triggered.")

    summary_line = (
        f"Wallet {wallet_address} is classified as {risk_class} "
        f"with an AI risk score of {risk_score:.2f}/100."
    )
    reasons_block = "\n".join(f"- {reason}" for reason in reasons)

    report = f"""
==============================
AI Investigation Report
==============================

1. AI Investigation Summary
{summary_line}

2. Risk Assessment
- Wallet Address: {wallet_address}
- Risk Score: {risk_score:.2f}/100
- Classification: {risk_class}
- Suspicious Transactions: {suspicious_tx}
- Unknown Counterparties: {unknown_wallets}
- Total Volume: {total_volume:.6f} ETH

3. Reasons for Suspicion
{reasons_block}

4. Possible Activity Pattern
{_possible_pattern(suspicious_tx, unknown_wallets, total_volume)}

5. Recommendation
{_recommendation(risk_score)}
""".strip()

    return report
