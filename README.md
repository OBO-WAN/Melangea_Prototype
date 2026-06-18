# Mélange à Deux & Amis

Official website for the music ensemble **Mélange à Deux & Amis**.

## Features

- Responsive multi-page website for the ensemble and its projects.
- Home, ensemble, concerts, programmes, media, booking, press/news, privacy and imprint pages.
- Dynamically rendered public concert listings from JSON data.
- PHP-based concert administration for hosted production environments.
- CD/music order form with a PHP submission endpoint.
- PHP-based booking request form.
- Newsletter signup integration using Firebase Firestore.
- Responsive YouTube embeds using `youtube-nocookie.com`.
- Accessible overlays for musician bios, newsletter signup, CD orders and image lightboxes.
- Custom German form validation in JavaScript with independent PHP server-side validation for PHP forms.
- Separate GitHub Pages demo/static behavior and PHP-hosting production behavior.

## Technology

- HTML
- CSS
- Vanilla JavaScript
- PHP 8
- JSON
- Firebase, where currently used for newsletter signups
- AOS, where currently used for scroll animations

## Project structure

- `index.html` — main landing page with hero, concerts, videos, music/CD order, bios and newsletter sections.
- `ueber_uns.html`, `konzerte.html`, `programme.html`, `medien.html`, `booking.html`, `presse.html`, `datenschutz.html`, `impressum.html` — public website pages.
- `assets/` — images, audio, video and PDF assets.
- `css/` — shared, component, responsive and subpage styles.
- `JS/` — frontend modules for sliders, overlays, concert rendering, validation, booking, orders and newsletter behavior.
- `data/` — public JSON data, including concert listings.
- `php/` — PHP endpoints and example configuration for booking and CD/music order submissions.
- `admin/` — PHP concert administration area.
- `demo/` — static browser-only demo of the concert administration for environments without PHP.
- `vendor/` — locally vendored frontend libraries such as AOS.
- `fonts/` — local font assets.
- `pdf-src/` — source files for PDF content.

## Concert management

Public concert listings are loaded from `data/concerts.json` by the frontend JavaScript. The production admin area in `admin/` reads and updates the same concert data through PHP.

Local/private admin configuration is not committed. Create local configuration from the provided example file when deploying the PHP admin area, and keep secrets out of version control.

## Forms

- CD/music orders submit to `php/cd-order-submit.php`.
- Booking requests submit to `php/booking-submit.php`.
- Public forms use `novalidate` so the site can show consistent custom German validation messages.
- JavaScript performs visible client-side validation and status messaging.
- PHP endpoints perform independent server-side validation for submitted booking and order data.
- GitHub Pages cannot execute PHP. Static/demo environments therefore show demo or fallback behavior instead of processing PHP submissions.
- Local email delivery may fail when no local sendmail service is installed, even if the PHP validation and form-processing code can still be tested.

## Newsletter / Firebase

Newsletter signups use the Firebase Web SDK and Firestore from the frontend JavaScript. Firebase setup is currently loaded from `JS/firebase-config.js`, and newsletter form behavior is handled in `JS/newsletter-submit.js` and shared validation code.

Before production changes, verify Firestore security rules, mail-processing configuration, consent text and retention behavior for the target deployment.

## Deployment

### GitHub Pages

- Static frontend/demo environment.
- PHP submissions are not executed.
- Demo or fallback messages are shown for PHP-backed functionality.
- The static concert admin demo is available under `demo/` and stores demo changes only in the browser.

### Alfahosting

- Production PHP hosting environment.
- PHP endpoints process booking and CD/music-order submissions.
- Local configuration files must be created from the provided example files.
- Configured sender email addresses must belong to the hosted domain.
- Do not commit passwords, password hashes, SMTP credentials, private bank details or other secrets.

## Local development

Because JavaScript modules are used (`type="module"`), run the site through a local web server rather than opening files with `file://`.

For static frontend work, for example:

```bash
python3 -m http.server 8080
```

For PHP endpoint testing, run:

```bash
php -S localhost:8000
```

Then open `http://localhost:8000` in a browser. Local email delivery may fail if no local sendmail service is installed, but PHP form validation and request handling can still be tested.

## Configuration

Example configuration files currently included in the repository:

```text
php/booking-config.example.php
php/cd-order-config.example.php
admin/config.example.php
```

Create the corresponding local files as needed:

```text
php/booking-config.local.php
php/cd-order-config.local.php
admin/config.local.php
```

The `.local.php` files are ignored by Git and must not be committed.

## Privacy and media

Embedded YouTube videos use:

```text
youtube-nocookie.com
```

This README describes the project implementation only and does not provide legal compliance guarantees.

## Static admin demo

A public-safe static demo of the concert admin interface is available at `demo/admin-demo-login.html`.

- Demo password: `demo`
- The fake login runs only in browser JavaScript and stores its session state in `sessionStorage`.
- Demo editor changes are saved only in this browser with `localStorage`; no server data is changed.
- The real admin interface requires PHP hosting and does not run on GitHub Pages.
