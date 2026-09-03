EMA ARTBUILD — Netlify deployment

This is the frontend extracted from the Emergent project, prepared so Netlify can build it from the repository root.

Netlify settings if entered manually:
- Branch: main
- Base directory: leave empty
- Build command: npm run build
- Publish directory: build
- Functions directory: leave empty

Important: the quote form and assistant use REACT_APP_BACKEND_URL and therefore require the backend to be deployed separately.
