-- ============================================================
-- Truva Protocol — Dune Analytics Dashboard Queries
-- Program ID: BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5
-- ============================================================

-- QUERY 1: Agent Passport Creation Over Time
-- Chart type: Area chart
SELECT
  DATE_TRUNC('day', block_time) AS day,
  COUNT(*) AS passports_created
FROM solana.transactions
WHERE contains(account_keys, 'BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5')
  AND success = true
GROUP BY 1
ORDER BY 1;

-- QUERY 2: Trust Tier Distribution
-- Chart type: Pie chart
SELECT
  CASE
    WHEN trust_tier = 0 THEN 'Bronze'
    WHEN trust_tier = 1 THEN 'Silver'
    WHEN trust_tier = 2 THEN 'Gold'
  END AS tier,
  COUNT(*) AS agent_count
FROM truva_decoded.passports
GROUP BY trust_tier;

-- QUERY 3: TrustGate Payment Volume (Daily)
-- Chart type: Bar chart
SELECT
  DATE_TRUNC('day', block_time) AS day,
  SUM(amount_sol) AS total_sol_transferred,
  COUNT(*) AS payment_count
FROM truva_decoded.payments
GROUP BY 1
ORDER BY 1;

-- QUERY 4: Top 10 Agents by Trust Score
-- Chart type: Table
SELECT
  agent_pubkey,
  trust_score,
  CASE
    WHEN trust_tier = 0 THEN 'Bronze'
    WHEN trust_tier = 1 THEN 'Silver'
    WHEN trust_tier = 2 THEN 'Gold'
  END AS tier,
  tx_count,
  success_count
FROM truva_decoded.passports
ORDER BY trust_score DESC
LIMIT 10;

-- QUERY 5: Frozen vs Active Passports
-- Chart type: Counter / Pie
SELECT
  CASE WHEN frozen THEN 'Frozen' ELSE 'Active' END AS status,
  COUNT(*) AS count
FROM truva_decoded.passports
GROUP BY frozen;

-- QUERY 6: Daily Active Agents (made a TrustGate transaction)
-- Chart type: Line chart
SELECT
  DATE_TRUNC('day', block_time) AS day,
  COUNT(DISTINCT signer) AS active_agents
FROM solana.transactions
WHERE contains(account_keys, 'BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5')
  AND success = true
GROUP BY 1
ORDER BY 1;
