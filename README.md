# DNA Double Helix

A standalone Canvas 2D visualization of a DNA double helix that turns into a rotating particle ring and reassembles in a continuous loop. Move the pointer over the helix or tap it to disturb the particles. The playback button pauses and resumes the animation. The visualization pauses when it leaves the viewport or its tab becomes hidden, and it respects the system’s reduced-motion preference.

## Run locally

Download or clone the repository and open `index.html` in a modern browser. Keep the files in their existing folders. The page runs offline, including the fallback image and translations.

The language menu offers English, 简体中文, and 繁體中文. It starts in English and remembers your selection when the browser allows local storage.

To serve the same files over HTTP, run this command in the repository directory:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Files

- `index.html` contains the visualization and playback button.
- `styles.css` sets the panel layout and static fallback.
- `helix.js` initializes the canvas and draws the animation.
- `helix-still.png` is the still frame used if Canvas or JavaScript is unavailable.
- `locale.js` manages language selection, with Traditional Chinese conversion and licenses in `vendor/`.
