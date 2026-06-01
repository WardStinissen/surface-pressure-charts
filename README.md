# Surface Pressure Charts

A static PWA that shows the latest UK Met Office surface pressure charts. Navigate
across forecast steps and zoom into a location; the zoom and centre persist as you
move between charts, so you can compare how a system evolves.

## Develop

Static files, no build step.

- Run tests: `npm test`
- Serve locally: `python3 -m http.server 8000`, then open http://localhost:8000/

## Deploy (GitHub Pages)

1. Push to a GitHub repository.
2. Settings → Pages → Build and deployment → Source: "Deploy from a branch",
   branch `main`, folder `/ (root)`.
3. Open the published URL on your iPhone in Safari, then Share → "Add to Home Screen".

## Data source

Charts are public GIFs from the Met Office consumer-digital API. Two runs per day:
morning (`FSXX00T`, 8 charts) and evening (`FSXX12T`, 9 charts). See
`docs/superpowers/specs/2026-06-01-surface-pressure-charts-design.md` for details.
