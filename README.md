# DNA Double Helix

A standalone Canvas 2D visualization of a rotating DNA double helix. Move the pointer over the helix or tap it to disturb the particles. The playback button pauses and resumes the animation. The visualization pauses when it leaves the viewport or its tab becomes hidden, and it respects the system’s reduced-motion preference.

## Run locally

Open `index.html` in a modern browser. Everything runs locally, including the fallback image. No build tools, packages, or API keys are required.

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
