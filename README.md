# #TOGETHERBAND B2B Studio

A browser-based studio for building partner proposals: brand a Special Edition
#TOGETHERBAND for a corporate or charity partner, see the packaging with their
logo on it, price the order and generate the presentation.

Open `index.html` through any static web server (or GitHub Pages). There is no build step.

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

## What it does

- **Packaging**: a turnable 3D gift box, flat front/back proofs of the branded sleeve,
  the concertina booklet insert and the QR card. Upload the partner's logo (PNG/SVG,
  drag-and-drop or paste); the brand colour is taken from the logo automatically on a
  new project. "Export image" renders the whole sheet as a PNG to send to the client.
- **Band variants**: Mini, Classic, Braided and Heart styles in any SDG cord colour,
  with polished, gold, rose gold, onyx, rainbow or metallic clasps.
- **Costs & impact**: volume tiers, packaging cost, donation % and per-band impact
  (trees, CO₂, meals), plus a quick quote for any quantity.
- **Presentation**: the standard partner deck (mission, impact, materials, product
  slides per variant, packaging, costs table, thank you), re-branded in the partner's
  colour. Present full screen, or Print / Save as PDF (one slide per landscape page).

Projects are saved in the browser. Use **Save / load file** to share a project with a
colleague as a JSON file. The LITGIRLS and Unlock Futures decks are included as sample projects.

## Files

- `index.html` – studio shell and editor
- `assets/js/data.js` – SDG colours, band styles, finishes, defaults, sample partners
- `assets/js/render.js` – band, packaging, slide and cost-table renderers
- `assets/js/app.js` – state, editor bindings, preview, export, presenting
- `assets/css/studio.css` – studio UI and artwork styles
- `assets/img/` – photography from the existing partner decks
