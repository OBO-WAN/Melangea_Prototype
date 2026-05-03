# Mélange à Deux — Website Prototype

A static, German-language website prototype for the ensemble **Mélange à Deux & Amis**.

The project includes:
- A homepage with hero slider, events, media, player bios, and contact sections.
- A dedicated “Über uns” page with long-form ensemble history.
- Custom audio player behavior and newsletter signup overlay.
- Firebase Firestore integration for storing newsletter signups and triggering notification emails.

## Tech Stack

- **HTML5** (multi-page static site)
- **CSS** (modular stylesheets under `css/`)
- **Vanilla JavaScript** (UI behavior under `JS/`)
- **Firebase Web SDK (v12.12.1)** for Firestore writes

## Project Structure

- `index.html` — main landing page
- `ueber_uns.html` — about page
- `css/` — base, layout, mobile, component, and subpage styling
- `JS/` — UI modules (navigation, overlays, slider, audio, validation, newsletter)
- `assets/` — images, audio, video, and PDF bios
- `firebase.json` — Firebase Hosting configuration
- `SECURITY.md` — security policy template

## Local Development

Because JavaScript modules are used (`type="module"`), run via a local web server (not `file://`).

Example options:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Or with Node:

```bash
npx serve .
```

## Newsletter / Firebase Setup

The newsletter form submits to Firestore collections:
- `newsletter_signups`
- `mail`

Current Firebase config is loaded client-side from `JS/firebase-config.js`.

Before production use:
1. Move secrets/config management to environment-specific delivery.
2. Restrict Firestore security rules appropriately.
3. Ensure the backend email extension/process consuming `mail` is configured.
4. Verify consent and retention policies for your jurisdiction.

## Deployment

This repository is configured for Firebase Hosting via `firebase.json`.

```bash
firebase deploy
```

> Note: `firebase.json` currently sets `hosting.public` to `firebase-public`. Ensure your build/deploy output matches this directory.

## Status

Prototype / pre-production. Content and operational hardening are still in progress.
