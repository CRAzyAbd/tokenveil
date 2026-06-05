# TokenVeil

A Claude.ai browser extension that blends natively into the UI. Small, calm, and stays out of your way — a single pill in the corner that expands when you need it.

![Version](https://img.shields.io/badge/version-1.0.0-CC785C) ![License](https://img.shields.io/badge/license-MIT-CC785C) ![Browser](https://img.shields.io/badge/Chrome%20%7C%20Edge-compatible-CC785C)

## What it shows

When collapsed → a small pill in the bottom-right with your context usage %.

When expanded → 
- **Context** — tokens used out of the 200k window, with a bar
- **Session** — your 5-hour message usage, with reset countdown
- **Weekly** — your 7-day message usage, with reset countdown
- **Model** — which Claude model is currently active

The pill dot turns yellow above 70% and red above 90% — you'll know without even expanding.

## Why "veil"?

It's there, but you don't feel it. Matches Claude's cream/coral palette in both light and dark mode. Looks like it ships with the site.

## Install

1. Clone this repo
```bash
   git clone https://github.com/YOUR_USERNAME/tokenveil.git
```
2. Open `chrome://extensions`
3. Enable **Developer mode** (top-right)
4. Click **Load unpacked** and select the `tokenveil` folder
5. Open claude.ai — pill appears in the bottom-right

## Project Structure

<pre>
tokenveil/
├── icons/                        # Cream + coral extension icons
├── src/
│   ├── modules/
│   │   ├── tokenCounter.js       # Token estimation
│   │   ├── usageTracker.js       # Claude /usage API
│   │   └── modelDetector.js      # Active model detection
│   ├── content.js                # Main injection script
│   ├── background.js             # Service worker
│   └── styles.css                # Native-feel styling
├── popup/                        # Extension popup
└── manifest.json
</pre>

## Privacy

All data stays local. The extension only talks to claude.ai. No external servers, no tracking, no analytics.

## License

MIT
