# Exo-extract
An AI-Vision Powered Micro-Segregation Hub for Decentralised E-Waste Management and Safe Precious Metal Recovery
# EcoExtract: AI-Vision Micro-Segregation Hub Dashboard

Live web dashboard and API for decentralised e-waste management: leaderboard, weight/value/CO₂ trackers, bin levels and a hub deposit API.
Made by Shivam Singh Patel, NextGen AI Studio.

## Run locally
```
npm install
HUB_KEY=your-secret npm start      # open http://localhost:3000
pip install requests && python hub/hub_client.py   # sends a test deposit
```

## API
`POST /api/v1/hub/deposit` (header `x-api-key`) with `hub_id`, `user_id`, `detected_items[]`.
`GET /api/stats` and `GET /api/leaderboard` feed the page.

## Deploy
- **Quick (free):** push to GitHub, then create a Web Service on Render or Railway: build `npm install`, start `npm start`, set `HUB_KEY`.
- **Google:** Cloud Run (`gcloud run deploy --source .`) or Firebase Hosting for `public/` only (the page shows demo data without the backend).

## Before presenting
- Edit the email, helpline and address in the footer of `public/index.html`.
- Replace the price and CO₂ assumptions in `RATES` in `server.js` with real, cited figures.
- Data is in memory and resets on restart. Swap in Firestore or PostgreSQL for permanent storage.

## Safety
Never burn or open lithium batteries. Use gloves and eye protection for leaching, with adult supervision.
