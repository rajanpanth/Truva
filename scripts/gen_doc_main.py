"""Part 3: Main generator — assembles the Word document"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from gen_doc_part1 import *
from gen_doc_part2 import TRACKS

doc = Document()

# ── Style defaults ──
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(11)

# ── Title Page ──
build_title_page(doc)

# ── Table of Contents ──
add_styled_heading(doc, "Table of Contents", level=1)
toc_items = [
    "1. Executive Summary",
    "2. Track Overview — All 13 Applicable Tracks",
    "3. Tier 1 Tracks (Zero/Minimal Changes)",
    "   3.1 Nepal Regional Track — $10,000",
    "   3.2 100xDevs Track — $10,000",
    "   3.3 Adevar Labs — $50,000 Audit Credits",
    "   3.4 SNS Identity Track — $5,000",
    "4. Tier 2 Tracks (Integration Required)",
    "   4.1 Eitherway — $20,000",
    "   4.2 Zerion CLI — $5,000",
    "   4.3 Torque MCP — $3,000",
    "   4.4 Jupiter — $3,000",
    "   4.5 Dune Analytics — $6,000",
    "   4.6 RPC Fast — $10,000",
    "5. Tier 3 Tracks (Stretch Goals)",
    "   5.1 Cloak — $5,010",
    "   5.2 Encrypt & Ika — $15,000",
    "   5.3 Umbra — $10,000",
    "6. Priority Action Plan (48-Hour Schedule)",
    "7. Submission Checklist",
    "8. Demo Video Script Templates",
]
for item in toc_items:
    p = doc.add_paragraph(item)
    p.paragraph_format.space_after = Pt(2)
    if not item.startswith("   "):
        for r in p.runs:
            r.bold = True

doc.add_page_break()

# ── Executive Summary ──
add_styled_heading(doc, "1. Executive Summary", level=1)
doc.add_paragraph(
    "Truva Protocol is an on-chain trust and reputation layer for AI agents on Solana. "
    "It provides programmable, on-chain trust gates for AI agent payments via Passport PDAs "
    "with trust scores (0-100) and tiers (Bronze → Silver → Gold). Any Solana protocol can "
    "integrate TrustGate to block untrusted agents with a single CPI call."
)
doc.add_paragraph(
    "After analyzing all 54 Frontier Hackathon tracks, we identified 13 tracks where Truva "
    "can submit — spanning $125,510+ in potential prizes. This document provides the complete "
    "implementation guide for each track, including exact code changes, submission narratives, "
    "and a prioritized 48-hour execution plan."
)
add_info_box(doc, "You can submit to ALL tracks simultaneously. Do Tier 1 first (zero changes), then work through Tier 2 and 3.", "IMPORTANT")

doc.add_paragraph()
add_table(doc,
    ["Tier", "Tracks", "Total Prizes", "Effort"],
    [
        ["Tier 1 (Zero Changes)", "4 tracks", "$75,000+", "~2 hours total"],
        ["Tier 2 (Integrations)", "6 tracks", "$47,000", "~20 hours total"],
        ["Tier 3 (Stretch)", "3 tracks", "$30,010", "~20 hours total"],
    ]
)

doc.add_page_break()

# ── Track Overview Table ──
add_styled_heading(doc, "2. Track Overview — All 13 Applicable Tracks", level=1)
add_table(doc,
    ["#", "Track", "Prize", "Fit", "Effort"],
    [[str(i+1), t["name"], t["prize"].split("(")[0].strip(), t["fit"], t["effort"]] for i, t in enumerate(TRACKS)]
)

doc.add_page_break()

# ── Individual Track Sections ──
tier_labels = {
    "TIER 1": "3. Tier 1 Tracks — Zero/Minimal Changes (Submit Immediately)",
    "TIER 2": "4. Tier 2 Tracks — Integration Required",
    "TIER 3": "5. Tier 3 Tracks — Stretch Goals",
}
current_tier = None
section_num = {"TIER 1": 1, "TIER 2": 1, "TIER 3": 1}
tier_section = {"TIER 1": "3", "TIER 2": "4", "TIER 3": "5"}

for i, track in enumerate(TRACKS):
    tier_key = track["tier"].split(" —")[0]
    if tier_key != current_tier:
        current_tier = tier_key
        doc.add_page_break()
        add_styled_heading(doc, tier_labels[tier_key], level=1)
    
    sub = f"{tier_section[tier_key]}.{section_num[tier_key]}"
    section_num[tier_key] += 1
    
    add_styled_heading(doc, f"{sub} {track['name']}", level=2)
    
    # Info table
    add_table(doc,
        ["Property", "Value"],
        [
            ["Sponsor", track["sponsor"]],
            ["Prize", track["prize"]],
            ["Classification", track["tier"]],
            ["Estimated Effort", track["effort"]],
            ["Fit Score", track["fit"]],
        ]
    )
    doc.add_paragraph()
    
    # Description
    add_styled_heading(doc, "Track Description & Fit", level=3)
    doc.add_paragraph(track["desc"])
    
    # What to do
    add_styled_heading(doc, "Implementation Steps", level=3)
    for step_i, step in enumerate(track["what_to_do"], 1):
        p = doc.add_paragraph(f"{step_i}. {step}")
        p.paragraph_format.space_after = Pt(3)
    
    # Code changes
    if track["code"]:
        add_styled_heading(doc, "Code Changes", level=3)
        add_code_block(doc, track["code"])
    
    # Narrative
    add_styled_heading(doc, "Submission Narrative", level=3)
    p = doc.add_paragraph()
    r = p.add_run(track["narrative"])
    r.italic = True
    r.font.color.rgb = RGBColor(0x33, 0x33, 0x66)

# ── Action Plan ──
doc.add_page_break()
add_styled_heading(doc, "6. Priority Action Plan (48-Hour Schedule)", level=1)
add_info_box(doc, "Start with Tier 1 submissions — they require ZERO code changes and can be done in under 2 hours total.", "CRITICAL")
doc.add_paragraph()

add_table(doc,
    ["Hour", "Action", "Tracks Covered", "Prize Potential"],
    [
        ["0–1", "Submit existing project to Nepal + 100xDevs + Adevar", "3 tracks", "$70,000"],
        ["1–3", "Add SNS .sol domain support → submit to SNS Identity", "1 track", "$5,000"],
        ["3–4", "Switch RPC to RPC Fast, update README", "1 track", "$10,000"],
        ["4–7", "Build Dune Analytics dashboard", "1 track", "$6,000"],
        ["7–10", "Build Torque MCP server", "1 track", "$3,000"],
        ["10–14", "Build Zerion CLI demo agent", "1 track", "$5,000"],
        ["14–18", "Integrate Jupiter APIs (Trust-Gated DCA)", "1 track", "$3,000"],
        ["18–26", "(If time) Eitherway full dApp integration", "1 track", "$20,000"],
        ["26–32", "(If time) Cloak privacy integration", "1 track", "$5,010"],
        ["32–36", "Record demo videos for each submission", "All tracks", "—"],
        ["36–40", "Polish submissions, write narratives, submit all", "All tracks", "—"],
    ]
)

# ── Submission Checklist ──
doc.add_page_break()
add_styled_heading(doc, "7. Submission Checklist", level=1)

add_styled_heading(doc, "Pre-requisites (Do First)", level=3)
checklist_pre = [
    "Submit to Colosseum Portal (required for ALL sidetracks)",
    "Ensure GitHub repo is public with clean README",
    "Have Devnet deployment URL ready",
    "Prepare wallet with Devnet SOL for demos",
]
for item in checklist_pre:
    doc.add_paragraph(f"☐ {item}")

add_styled_heading(doc, "Zero-Change Submissions (Hour 0–1)", level=3)
for item in ["Nepal Regional — submit existing project", "100xDevs — submit existing project", "Adevar Labs — submit Anchor program for audit"]:
    doc.add_paragraph(f"☐ {item}")

add_styled_heading(doc, "Quick-Change Submissions (Hour 1–4)", level=3)
for item in ["SNS Identity — add .sol domain resolution", "RPC Fast — switch RPC provider, update .env"]:
    doc.add_paragraph(f"☐ {item}")

add_styled_heading(doc, "Integration Submissions (Hour 4–18)", level=3)
for item in ["Dune Analytics — build reputation dashboard", "Torque MCP — build MCP server", "Zerion CLI — build demo agent", "Jupiter — Trust-Gated DCA agent"]:
    doc.add_paragraph(f"☐ {item}")

add_styled_heading(doc, "Stretch Submissions (Hour 18–32)", level=3)
for item in ["Eitherway — full dApp integration", "Cloak — privacy payments", "Encrypt & Ika — encrypted trust verification", "Umbra — stealth address payments"]:
    doc.add_paragraph(f"☐ {item}")

add_styled_heading(doc, "For EVERY Submission", level=3)
for item in [
    "GitHub repo link (public, clean README)",
    "Demo video (2–3 min, tailored to each track's requirements)",
    "Live deployment URL (Devnet)",
    "Brief write-up explaining how Truva fits that specific track",
    "Screenshots of working features",
]:
    doc.add_paragraph(f"☐ {item}")

# ── Demo Video Scripts ──
doc.add_page_break()
add_styled_heading(doc, "8. Demo Video Script Templates", level=1)

scripts = [
    ("Nepal / 100xDevs / General", [
        "0:00–0:15 — Intro: 'Hi, I'm [name] from Nepal. This is Truva Protocol.'",
        "0:15–0:45 — Problem: 'AI agents handle real money, but there's no way to verify trust.'",
        "0:45–1:30 — Solution: Show the dashboard, registry, agent passports",
        "1:30–2:15 — Live demo: Register an agent, show trust score updating, try a payment",
        "2:15–2:45 — SDK: Show the Eliza plugin and LangChain tool integration",
        "2:45–3:00 — Close: 'TrustGate — the gate nobody else has built.'"
    ]),
    ("SNS Identity Track", [
        "0:00–0:15 — Intro: 'Truva + SNS = human-readable, trust-verified agent identities'",
        "0:15–0:45 — Show: Looking up an agent by .sol name instead of pubkey",
        "0:45–1:30 — Demo: resolveAgent('my-agent.sol') → trust score + tier",
        "1:30–2:00 — Close: 'Every .sol identity gets a verifiable trust passport on Solana'"
    ]),
    ("Zerion CLI Track", [
        "0:00–0:15 — Intro: 'An autonomous agent that only trades with trusted counterparties'",
        "0:15–0:45 — Show: Agent wallet creation with AgentWallet.generate()",
        "0:45–1:30 — Demo: Agent checks counterparty trust before executing trade",
        "1:30–2:00 — Show: wrapWithTrustGate middleware in action",
        "2:00–2:30 — Close: 'Trust-first autonomous trading on Solana'"
    ]),
]

for title, steps in scripts:
    add_styled_heading(doc, f"Script: {title}", level=3)
    for step in steps:
        doc.add_paragraph(step)
    doc.add_paragraph()

# ── Save ──
output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Truva_Frontier_Implementation_Guide.docx")
doc.save(output_path)
print(f"Document saved to: {output_path}")
