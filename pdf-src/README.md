# PDF Source Design System (Musician Bios)

This folder contains editable HTML/CSS source files for the four musician biography PDFs.

## Structure

- `pdf-src/bios/bio-print.css` — shared print design system for all bios
- `pdf-src/bios/uwe-hanewald-bio.html`
- `pdf-src/bios/ulrike-albeseder-bio.html`
- `pdf-src/bios/wolfgang-maye-bio.html`
- `pdf-src/bios/wolfgang-disch-bio.html`

## Design goals

- A4 print-first layout (`@page size: A4`)
- elegant minimal composition with generous margins
- brand-inspired dark blue / purple accent
- strong name title, clear subtitle, readable body copy
- subtle footer for website and booking contact
- shared reusable stylesheet for consistency

## Preview locally

Open any source file directly in your browser, for example:

- `pdf-src/bios/uwe-hanewald-bio.html`

## Manual PDF export (no Node workflow required)

Because this repository currently has no Node build workflow, PDFs should be exported manually from the browser:

1. Open one bio HTML file in Chrome/Edge/Safari/Firefox.
2. Print (`Ctrl/Cmd + P`).
3. Destination: **Save as PDF**.
4. Paper size: **A4**.
5. Margins: **Default** (the file already defines print margins via CSS).
6. Disable browser headers/footers.
7. Save with the target filename when you are ready to replace production PDFs.

## Regeneration

To regenerate polished PDFs later, repeat the print export steps for each HTML source after editing text or styles.
