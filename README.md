<div align="center">

# ⌬ EcoExtract

### AI-Powered E-Waste Management Platform

**Tagore Bal Vigyan Parv 2026 — Research Events**
*Theme: Reduce • Reuse • Recycle*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-5fe0a0?style=for-the-badge)](https://shivamgamingwithlokicraft-stack.github.io/Exo-extract/frontend/)
[![Terminal View](https://img.shields.io/badge/Terminal%20View-Console-0f4a36?style=for-the-badge)](https://shivamgamingwithlokicraft-stack.github.io/Exo-extract/frontend/terminal.html)

**By Shivam Singh Patel** • NextGen AI Studio
Madhya Pradesh, India

</div>

---

## 📖 What Is EcoExtract?

EcoExtract is a **free, browser-based platform** that helps schools and communities collect, identify, and track electronic waste using AI — with no server required for the demo, and no installation for users.

In 2022, the world generated **62 million tonnes** of e-waste. Only **22.3%** was formally recycled. The remaining 78% was dumped, burned, or processed by informal workers who lose the valuable metals and inhale toxic fumes.

**EcoExtract fixes the collection end of this problem.**

---

## 🎯 The Problem We Solve

| Challenge | EcoExtract's Solution |
|---|---|
| People don't know what is e-waste or how to sort it | **AI Vision Scanner** classifies items in-browser |
| Schools have no way to measure collection impact | **Live Dashboard** with bins, records, and totals |
| No motivation for students to participate | **School Challenge** — gamified leaderboard |
| Impact claims feel abstract | **Impact Lab** with cited, verified CO₂ calculations |
| Privacy concerns with photo uploads | **Zero uploads** — all AI runs on the user's device |

---

## ✨ Core Features

### 🤖 AI Vision Scanner
- Runs **CLIP ViT-Base** in-browser via Transformers.js
- Classifies **5 e-waste streams**: PCB, copper, battery, gold-bearing, mixed
- Returns **similarity score** (not fake confidence)
- Flags low-confidence results as **"needs review"**
- **Zero server uploads** — photos never leave the device

### 📊 Live Operations Dashboard
- Real-time bin fill levels across 5 material streams
- Community leaderboard of participating schools
- Live telemetry terminal with timestamped events
- Admin controls: reset bins, maintenance mode, empty selected bin

### 🏫 School Challenge
- Judges and visitors can scan the QR code
- Join the challenge with their school name
- Leaderboard shows top 5 schools by points
- Every confirmed collection adds points

### 📈 Impact Lab
- Totals from **confirmed records only** (no fake data)
- Category breakdown with visual bars
- Optional CO₂e estimate using **user-supplied, cited emission factor**
- CSV export of all records

### 🎨 Dual View System
- **Main site** — polished, friendly UI for students and judges
- **Terminal console** — technical operations view with live telemetry
- **Light/dark theme** — persisted per user

### 🔬 Research-Backed
- 4 peer-reviewed sources cited in-app
- Global E-Waste Monitor 2024 (UNITAR)
- Forti et al. 2020 (gold recovery from PCBs)
- Baldé et al. 2017 (energy savings)
- CPCB India 2022 (India-specific data)

---

## 🌐 Live Demo

| Access | URL |
|---|---|
| **Main Site** | [shivamgamingwithlokicraft-stack.github.io/Exo-extract/frontend/](https://shivamgamingwithlokicraft-stack.github.io/Exo-extract/frontend/) |
| **Terminal Console** | [shivamgamingwithlokicraft-stack.github.io/Exo-extract/frontend/terminal.html](https://shivamgamingwithlokicraft-stack.github.io/Exo-extract/frontend/terminal.html) |

**Demo Credentials**
- **Admin:** `admin@ecoextract.org` / `password`
- **Contributor:** any email / any password

---

## 🏗️ Architecture
