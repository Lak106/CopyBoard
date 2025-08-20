# CopyBoard
A single-page tool for copying notes to clipboard. Click a card to copy its text, code, and markdown. All notes auto-save in your browser.

## Features
- Separate cards for each note
- Click card to copy (plus a Copy button on each card)
- Add / Move cards up or down / Delete / Clear all / Copy all
- Autosave to `localStorage` (restores after refresh/crash)
- Keyboard: Alt+N adds a new card
- No build or dependencies; works offline

## Usage
1. Open `index.html` (or the split version: `index.html`, `main.css`, `script.js`).
2. Paste/type notes into cards.
3. Click anywhere on a card (outside the textarea) to copy that card’s text.

## Storage & Privacy
- Data is saved locally under the key `quickcopy.cards.v1`.
- Nothing is uploaded or synced; private windows may clear data on close.
  
## Future Features
- Tabs
- Groups
- Labels
- Light mode and Dark mode
- Code syntax highlighting
- Save notes to device
- Sharable link