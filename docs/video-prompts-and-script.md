# Truva Protocol — AI Video Prompts & Script

---

## GEMINI VEO — SCENE-BY-SCENE VIDEO GENERATION

> Paste each scene prompt individually into **Google AI Studio → Veo** (or Gemini Advanced with video generation).
> Generate each scene as a **3–5 second clip**, then stitch in CapCut or VEED.
> Total assembled video: ~12 seconds.

---

### STORY CONCEPT

**"The Untrusted Agent"** — An AI agent tries to move 500 SOL. It gets blocked. It earns trust. It gets approved.
That's the full arc in 12 seconds.

---

### SCENE 1 — THE ATTEMPT (0–2s)

**What happens:** Dark terminal. An AI agent initiates a large payment. The screen shows the command.

**Gemini Prompt:**
```
Cinematic close-up of a dark developer terminal screen at night,
black background with dim blue ambient glow, white monospace text 
appearing line by line: "agent.sendPayment({ amount: 500, token: 'SOL' })",
next line appears: "checking trust tier...",
subtle green cursor blinking at end,
no faces, no people, photorealistic, 4K, film grain, 24fps, 4 seconds
```

---

### SCENE 2 — THE BLOCK (2–3.5s)

**What happens:** Red warning flashes. Payment denied. Hard cut. Bass hit moment.

**Gemini Prompt:**
```
Extreme close-up of a dark UI dashboard, a red alert badge snaps 
into frame with text "BLOCKED — BRONZE TIER", 
the entire screen flashes deep red once then returns to dark,
red neon border pulses around the screen edge,
high contrast dark red and black color palette,
cinematic, no faces, photorealistic, 3 seconds, fast energy
```

---

### SCENE 3 — THE PASSPORT (3.5–5s)

**What happens:** Agent Passport card appears. Shows trust score of 24. Bronze tier.

**Gemini Prompt:**
```
A sleek holographic identity card floating in dark space, 
deep navy background with subtle teal ambient glow,
the card shows: "Trust Score: 24 / 100" and "Tier: Bronze" 
in clean white sans-serif font on a dark card surface,
card slowly rotates 10 degrees, soft rim lighting,
cinematic product visualization, no people, 4K, 4 seconds
```

---

### SCENE 4 — THE ENGINE ACTIVATES (5–7s)

**What happens:** Reputation engine starts scoring. 6 signals processing. Score rises.

**Gemini Prompt:**
```
Abstract futuristic data visualization, dark background,
six glowing teal data streams flowing into a central score meter,
the meter needle smoothly sweeps from left to right as the number 
rises from 24 to 83, deep navy and neon green color palette,
fast flowing particles representing on-chain transaction data,
no text needed, cinematic motion graphics style, 4 seconds, smooth
```

---

### SCENE 5 — GOLD TIER UNLOCK (7–9s)

**What happens:** Score hits 83. Tier flips to Gold. Golden flash.

**Gemini Prompt:**
```
A dark sleek UI badge transforming: a bronze metallic badge 
dissolves with a burst of golden light particles, 
a new gold badge materializes with a warm glowing aura,
deep black background, golden and amber light scatter,
slow-motion particle burst at peak then settles,
premium fintech aesthetic, gold tier in text, no faces, cinematic, 3 seconds
```

---

### SCENE 6 — APPROVAL (9–10.5s)

**What happens:** Same transaction reruns. Green confirmation. 500 SOL sent.

**Gemini Prompt:**
```
Dark developer terminal screen, white monospace text appears:
"agent.sendPayment({ amount: 500, token: 'SOL' })",
next line types instantly: "✓ APPROVED — GOLD TIER",
the screen flashes bright green once, then returns to dark,
green neon glow pulses on screen edges,
cinematic, clean, high contrast, no faces, photorealistic, 3 seconds
```

---

### SCENE 7 — LOGO HOLD (10.5–12s)

**What happens:** Truva logo on black. Tagline. Program ID fades in small.

**Gemini Prompt:**
```
Minimalist product logo reveal on pure black background,
a small geometric shield icon fades in at center with a soft 
teal glow emanating outward, clean modern fintech aesthetic,
one line of text appears below: "Trust Layer for AI Agents on Solana",
deep black background, no motion blur, no faces,
premium startup branding style, cinematic, 2 seconds, still hold
```

---

### ASSEMBLY ORDER IN CAPCUT / VEED

```
Scene 1  →  Scene 2  →  Scene 3  →  Scene 4  →  Scene 5  →  Scene 6  →  Scene 7
  2s            1.5s         1.5s         2s           1.5s         1.5s         2s
```

**Add these caption overlays after assembly:**
| Timecode | Caption Text | Color |
|----------|-------------|-------|
| 0s | "AI agent. 500 SOL. No trust." | White |
| 2s | "BLOCKED." | `#f03636` red |
| 3.5s | "Trust Score: 24 / Bronze" | White |
| 5s | "Reputation Engine scores 6 signals." | White |
| 7s | "Score: 83. Tier: Gold." | `#fbbf24` gold |
| 9s | "APPROVED." | `#00e87a` green |
| 11s | "Truva Protocol — Solana Devnet" | Dim white |

**SFX:**
- Scene 2: single deep bass hit (1 frame)
- Scene 6: same bass hit (1 frame)
- Background: low ambient drone, -20dB

---

---

## SHORT-FORM VIDEO SCRIPT (≤12 seconds, X/Twitter)

### Visual Timeline

```
[0.0–1.0s]  HOOK — Black screen. White terminal text types instantly:
             "AI agent tries to move 500 SOL..."

[1.0–2.0s]  CUT — TrustGate UI flashes. Red badge: "BRONZE — BLOCKED"
             Bass hit SFX.

[2.0–4.0s]  MONTAGE — 3 rapid cuts (0.5s each):
             1. Agent Passport on screen: Trust Score 24 / Tier: Bronze
             2. Terminal: `trustgate.checkTier(agent)` → rejected
             3. Solana explorer tx: STATUS: FAILED

[4.0–6.5s]  MIDDLE — Same agent. Time-lapse progress bar fills.
             Captions: "Reputation Engine scores 6 on-chain signals."
             Trust Score counter ticks up: 24 → 51 → 83

[6.5–8.0s]  CUT — Registry dashboard. Badge flips: GOLD ✓
             Screen: "Tier: Gold · Unlimited Access"

[8.0–10.0s] RESULT — Agent sends transaction. Green flash. 
             On-screen text: "500 SOL — APPROVED"
             Same bass hit SFX.

[10.0–12.0s] LOGO HOLD — Truva logo. Tagline types out:
             "Trust Layer for AI Agents on Solana."
             Program ID fades in small: BTgy2r8R...
```

### Caption Layer (overlay text only, no voiceover)
```
0s   → "AI agent. 500 SOL. No trust score."
2s   → "BLOCKED."
4s   → "Reputation Engine activates."
6s   → "6 signals. Real on-chain data."
8s   → "Score: 83. Tier: Gold."
10s  → "Approved."
11s  → "Truva Protocol — Solana Devnet"
```

---

## AI GENERATION PROMPTS

### Runway / Pika / Sora — Cinematic Background Clips

Use these as B-roll / background layers. Generate each as a 3–4s loop.

**Clip 1 — Opening atmosphere**
```
Dark cinematic developer workspace at night, ultra-wide monitor showing
Solana blockchain explorer with green transaction confirmations, 
deep navy and black color palette, soft neon green glow, 
cinematic depth of field, no text, no people, 4K, 24fps
```

**Clip 2 — TrustGate block moment**
```
Abstract digital barrier visualization, red pulsing energy wall 
blocking a glowing data packet, dark background, high contrast,
neon red and black, cinematic slow-motion, cyberpunk aesthetic,
no text, loop-ready
```

**Clip 3 — Reputation scoring**
```
Futuristic holographic score meter rising from 0 to 100,
deep space dark background, teal and green neon glow,
data streams flowing into the meter, smooth animation, 
cinematic, no text, 4K
```

**Clip 4 — Gold tier approval**
```
Golden particle burst on dark background, clean minimal SFX flash,
soft golden glow radiating outward, 0.5 second peak then fades,
Gold Tier in text, loop-ready, cinematic
```

**Clip 5 — Solana network visualization**
```
Abstract Solana blockchain network graph, nodes pulsing with activity,
dark navy background, purple and green node connections,
fast transaction pulses traveling between nodes, 3D cinematic render,
no text, 4 seconds
```

---

### CapCut / VEED — Text Animation Style

Use these settings when adding captions:

- Font: Space Grotesk Bold or Inter Bold
- Color: `#FFFFFF` for normal text, `#00e87a` (green) for APPROVED, `#f03636` (red) for BLOCKED
- Animation: Word-by-word reveal, 0.1s delay per word
- Background: None (transparent over video)
- Size: Large, centered, bottom-third placement

---

### Adobe After Effects / Motion Graphics Spec

For the Passport card animation:

```
Component: Agent Passport Card
Background: #0b1118
Border: 1px solid #1a2e42
Text color: #dde8f0
Trust Score number: animates 0 → final value over 1.5s (ease-out)
Tier badge colors:
  Bronze: #cd7f32
  Silver: #a8a9ad  
  Gold:   #fbbf24
  Blocked overlay: #f03636 with 40% opacity fill
Card entrance: slide up + fade, 0.3s
```

---

## FULL PROMPT PACK (10 prompts for Runway/Sora)

Copy-paste each individually into Runway, Pika, or Sora:

```
1. Dark Solana developer terminal, green text scrolling, 
   transaction confirmations, cinematic close-up, no faces, 4K

2. Abstract trust score meter filling from empty to full, 
   neon green on black, futuristic UI, smooth animation

3. Red digital barrier blocking a payment transaction, 
   dark background, high contrast, cinematic freeze frame

4. Gold particle explosion on dark background, 
   celebration flash, premium fintech aesthetic

5. Holographic agent identity card floating in dark space, 
   teal glow, data fields populating automatically, 4K

6. Solana blockchain nodes lighting up in sequence, 
   transaction pathway glowing green, bird's-eye view, cinematic

7. Code compiling on dark screen, Rust syntax, 
   program deploy confirmation, terminal aesthetic, 24fps

8. Dashboard UI with live metrics updating in real-time, 
   dark mode fintech, trust score charts, no faces

9. Digital passport stamped with golden approval seal, 
   dark cinematic background, slow motion, premium look

10. Abstract AI agent as glowing node traveling through 
    a blockchain network, approved path glows green, 
    blocked path glows red, cinematic overhead view
```

---

## RECOMMENDED TOOL STACK

| Step | Tool | Purpose |
|------|------|---------|
| Screen record | OBS Studio | Capture real Truva UI + terminal |
| B-roll generation | Runway Gen-3 or Pika | Generate cinematic background clips |
| Editing + captions | CapCut | Auto-captions, zoom cuts, music sync |
| Motion overlays | VEED or Adobe Express | Animated text, badge transitions |
| SFX | Pixabay / Freesound | Bass hit, UI confirm sounds |

---

## NOTES

- Always open with the **BLOCKED** moment — not the approval. Conflict hooks faster.
- Keep the trust score counter visible as it rises — it's the clearest story beat.
- Do not add a voiceover. Captions only. Crypto X audience watches on mute.
- Post as `.mp4`, 9:16 for X mobile, under 12 seconds for max loop replays.
- Program ID in the last frame adds credibility with the dev audience.
