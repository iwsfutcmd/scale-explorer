# Scale Explorer

Play with variant musical scales in the browser. Pick a root note, a tuning
system (equal temperament, just intonation, or 3-limit/Pythagorean), and a
scale (Western modes, pentatonic scales, five traditional Chinese pentatonic
modes, six Persian dastgahs, or any of 5,401 scales from the Scala archive),
then tap the note buttons to hear it. Drag across the keyboard to play a
slur; scroll it for more octaves than fit on screen at once.

No build step — plain HTML/CSS/JS using the Web Audio API.

## Run locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Hosted via GitHub Pages from the `main` branch root.

## Data sources

- `scala-archive.json` is generated from the [Scala scale
  archive](https://www.huygens-fokker.org/scala/) (5,401 `.scl` files),
  created by Manuel Op de Coul and hosted by the Huygens-Fokker Foundation,
  freely distributed for exactly this kind of use. Regenerate it with
  `tools/build_scala_archive.py` after downloading and unzipping (with
  `unzip -aa`, per the archive's own instructions) a fresh copy of
  `scales.zip` from that site.
- The Chinese pentatonic modes and their exact 3-limit ratios, and the
  original keyboard/audio approach this app is built on, come from
  [audio_fun](https://github.com/iwsfutcmd/audio_fun) (not included here —
  only the underlying data was ported, not the code).
- The Persian dastgah scale degrees are transcribed from Wikipedia's
  [Dastgāh](https://en.wikipedia.org/wiki/Dastg%C4%81h) article, per the
  radif of Mirza Abdollah.
