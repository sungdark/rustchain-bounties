# The Fossil Record — RustChain Attestation Stratigraphy

**Bounty Issue:** [#2311](https://github.com/Scottcjn/rustchain-bounties/issues/2311)  
**Reward:** 75 RTC  
**Payment Address:** `eB51DWp1uECrLZRLsE2cnyZUzfRWvzUzaJzkatTpQV9`

---

## Overview

Interactive D3.js visualization showing every attestation from every miner since genesis, color-coded by CPU architecture family. Miners are rendered as geological strata — the older and more vintage the hardware, the deeper the layer.

Like looking at geological layers, but for silicon.

## Architecture Layers

From deepest (oldest/vintage) to surface (modern):

| Layer | Color | Architecture | Antiquity |
|-------|-------|-------------|-----------|
| Cambrian | 🟤 Dark Amber | Motorola 68K | 2.5x |
| Paleozoic | 🟫 Copper | PowerPC G3 | 1.8x |
| Mesozoic | 🟧 Warm Copper | PowerPC G4 | 2.5x |
| Bronze Age | 🟨 Bronze | PowerPC G5 | 2.0x |
| Crimson | 🔴 Deep Red | SPARC | 1.0x |
| Jade | 🟢 Jade Green | MIPS | 1.0x |
| Deep Blue | 🔵 Deep Blue | IBM POWER8 | 1.0x |
| Teal | 🔵 Teal | StarFive JH7110 (RISC-V) | 1.1x |
| Cyan | 🔵 Cyan | SiFive Unmatched (RISC-V) | 1.0x |
| Dark Cyan | 🔵 Dark Cyan | Milk-V Pioneer (RISC-V) | 0.9x |
| Silver | ⚪ Silver | Apple Silicon | 1.2x |
| Grey | ⚪ Light Grey | Intel Core 2 Duo | 1.3x |
| Pale Grey | ⚪ Pale Grey | Modern x86_64 | 1.0x |

## Features

- **Stratigraphy view**: Each epoch is divided into colored bands by architecture
- **Normalized mode**: sqrt-scaled heights so rare architectures remain visible
- **Absolute mode**: True miner count heights
- **Hover tooltips**: miner ID, device model, RTC earned, fingerprint quality
- **First-appearance annotations**: Gold dashed lines marking when new architectures joined
- **Epoch settlement markers**: Vertical dashed lines every 5 epochs
- **Era backgrounds**: Genesis → Bronze Age → Expedition Era → Active Era

## Files

```
fossils/
├── index.html   # Main D3.js visualization (self-contained)
├── data.js      # Mock attestation history (replace with live API call)
└── README.md    # This file
```

## Data Source

Currently uses `data.js` with mock attestation data that mirrors the RustChain network's architecture distribution.

To connect to the live network, replace the `window.DATA` assignment in `data.js` with an API call:

```javascript
// Replace mock data with live RustChain node query
async function loadLiveData() {
    const response = await fetch('https://50.28.86.131/api/v1/attestations');
    const attestations = await response.json();
    window.DATA = attestations.map(a => ({
        miner_id: a.miner_id,
        device_arch: a.device_arch,
        device_family: a.device_family,
        device_model: a.device_model,
        cpu_model: a.cpu_model,
        epoch: a.epoch,
        rtc_earned: a.rtc_earned,
        fp_quality: a.fp_quality,
        attestation_count: a.attestation_count,
    }));
}
```

## Deployment

Deploy to `rustchain.org/fossils` by copying `index.html` and `data.js` to the web server's static directory.

For GitHub Pages deployment, push to `gh-pages` branch.

## Tech Stack

- **D3.js v7** — visualization engine
- **Vanilla HTML/CSS/JS** — no build step required
- **Google Fonts** — system font stack

## Screenshots

Run `python3 -m http.server 8080` in this directory and open `http://localhost:8080` to view.

## License

Apache 2.0 — same as RustChain project.
