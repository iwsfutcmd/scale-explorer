"use strict";

// --- Note & tuning data -----------------------------------------------
// Ported from audio_fun's Scales/ScaleKeyboard/ChineseKeyboard components.

const NOTE_NAMES = [
  "C", "C♯/D♭", "D", "D♯/E♭", "E", "F",
  "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B",
];

// Traditional Chinese lülü names, from ChineseKeyboard.svelte's `notes` array.
// Same chromatic order as NOTE_NAMES (both start on C).
const CHINESE_NAMES = [
  "黃鐘", "大呂", "太簇", "夾鐘", "姑洗", "仲呂",
  "蕤賓", "林鐘", "夷則", "南呂", "無射", "應鐘",
];

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

const TUNINGS = {
  equal: {
    label: "Equal Temperament",
    steps: 12,
    // 12-tone equal temperament: each step is the 12th root of 2. Irrational —
    // no exact fraction, so `fractions` stays null.
    ratios: [...Array(12)].map((_, i) => 2 ** (i / 12)),
    fractions: null,
  },
  just: {
    label: "Just Intonation",
    steps: 12,
    // 5-limit just intonation ratios, from Scales.svelte / ScaleKeyboard.svelte.
    fractions: [
      [1, 1], [16, 15], [9, 8], [6, 5], [5, 4], [4, 3],
      [7, 5], [3, 2], [8, 5], [5, 3], [16, 9], [15, 8],
    ],
  },
  pythagorean: {
    label: "Pythagorean (3-limit)",
    steps: 12,
    // 3-limit ratios (powers of 3 and 2), from ChineseKeyboard.svelte's
    // exponentsChinese — also the exact ratios the Chinese pentatonic modes use.
    fractions: [
      [0, 0], [7, 11], [2, 3], [9, 14], [4, 6], [11, 17],
      [6, 9], [1, 1], [8, 12], [3, 4], [10, 15], [5, 7],
    ].map(([p3, p2]) => [3 ** p3, 2 ** p2]),
  },
  persian24: {
    label: "Persian (24-tone)",
    steps: 24,
    // 24-tone equal temperament (quarter tones) — the standard practical
    // approximation for Persian dastgah scales, whose neutral intervals fall
    // between the 12 Western semitones. Not user-selectable directly (see
    // `selectable` below): only reachable via a dastgah scale that locks to
    // it, the same way Chinese modes lock to Pythagorean tuning, since
    // Western/Chinese scales are defined in semitone units that would be
    // misinterpreted under a 24-tone gamut.
    ratios: [...Array(24)].map((_, i) => 2 ** (i / 24)),
    fractions: null,
    selectable: false,
  },
};
for (const tuning of Object.values(TUNINGS)) {
  if (tuning.fractions) {
    tuning.ratios = tuning.fractions.map(([n, d]) => n / d);
  }
}

// Scale patterns as semitone offsets from the root, within one octave.
// Chinese entries additionally pin `tuning`, since their character depends on
// the exact 3-limit ratios above, not whatever tuning happens to be selected.
const SCALE_GROUPS = {
  "Western": {
    "Major (Ionian)": [0, 2, 4, 5, 7, 9, 11],
    "Dorian": [0, 2, 3, 5, 7, 9, 10],
    "Phrygian": [0, 1, 3, 5, 7, 8, 10],
    "Lydian": [0, 2, 4, 6, 7, 9, 11],
    "Mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "Natural Minor (Aeolian)": [0, 2, 3, 5, 7, 8, 10],
    "Locrian": [0, 1, 3, 5, 6, 8, 10],
    "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
    "Melodic Minor (asc.)": [0, 2, 3, 5, 7, 9, 11],
  },
  "Pentatonic & Other": {
    "Major Pentatonic": [0, 2, 4, 7, 9],
    "Minor Pentatonic": [0, 3, 5, 7, 10],
    "Whole Tone": [0, 2, 4, 6, 8, 10],
    "Chromatic": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  // The five traditional Chinese pentatonic modes, from ChineseKeyboard.svelte's
  // scalesChinese (lülü note names converted to semitone offsets). They are
  // rotations of the pentatonic scale, and are locked to Pythagorean tuning
  // since that's the exact ratio system audio_fun paired them with.
  "Chinese Pentatonic Modes": {
    "Gong 宮 (I)": { degrees: [0, 2, 4, 7, 9], tuning: "pythagorean" },
    "Shang 商 (II)": { degrees: [0, 2, 5, 7, 10], tuning: "pythagorean" },
    "Jue 角 (III)": { degrees: [0, 3, 5, 8, 10], tuning: "pythagorean" },
    "Zhi 徵 (IV)": { degrees: [0, 2, 5, 7, 9], tuning: "pythagorean" },
    "Yu 羽 (V)": { degrees: [0, 3, 5, 7, 10], tuning: "pythagorean" },
  },
  // Six of the seven primary Persian dastgahs, from Wikipedia's "Dastgāh"
  // article (its koron/flat-annotated note spellings, per the radif of Mirza
  // Abdollah), converted to 24-tone quarter-tone degrees. Locked to the
  // persian24 tuning since these are neutral (~150-cent) intervals, not
  // representable in a 12-tone gamut. Shur, Bayat-e-Tork, and Nava share an
  // identical pitch collection in this source (they're distinguished by
  // melodic emphasis/hierarchy, not by which notes are available) — only
  // Shur is included here since this tool can't model that distinction.
  "Persian Dastgahs": {
    "Shur (شور)": { degrees: [0, 4, 7, 10, 14, 18, 20], tuning: "persian24" },
    "Segah (سه‌گاه)": { degrees: [0, 4, 7, 10, 14, 17, 20], tuning: "persian24" },
    "Homayun (همایون)": { degrees: [0, 4, 6, 10, 14, 17, 22], tuning: "persian24" },
    "Chahargah (چهارگاه)": { degrees: [0, 3, 8, 10, 14, 17, 22], tuning: "persian24" },
    "Mahur (ماهور)": { degrees: [0, 4, 8, 10, 14, 18, 22], tuning: "persian24" },
    "Rast-Panjgah (راست‌پنجگاه)": { degrees: [0, 4, 8, 10, 14, 18, 20], tuning: "persian24" },
  },
};

function findScaleEntry(scaleName) {
  for (const [groupName, scales] of Object.entries(SCALE_GROUPS)) {
    if (scaleName in scales) {
      const entry = scales[scaleName];
      const degrees = Array.isArray(entry) ? entry : entry.degrees;
      const fixedTuning = Array.isArray(entry) ? null : entry.tuning;
      return { degrees, fixedTuning, groupName };
    }
  }
  return { degrees: SCALE_GROUPS["Western"]["Major (Ionian)"], fixedTuning: null, groupName: "Western" };
}

const REF_A4 = 440;
const A_INDEX = NOTE_NAMES.indexOf("A");

function rootFrequency(rootIndex) {
  return REF_A4 * 2 ** ((rootIndex - A_INDEX) / 12);
}

// For N octaves, spread as evenly as possible below/above the root (extra
// octave goes on top for even N), e.g. 3 steps of 12 -> [-12, 0, 12].
// `steps` is the tuning's steps-per-octave (12 for everything except the
// 24-tone Persian tuning), so this works the same way for either.
function octaveOffsets(count, steps) {
  const below = Math.floor((count - 1) / 2);
  const above = Math.ceil((count - 1) / 2);
  const offsets = [];
  for (let i = -below; i <= above; i++) offsets.push(i * steps);
  return offsets;
}

// The requested number of octaves, plus one closing note an octave above the
// topmost one, so every run resolves back onto the root.
function buildDegreeSequence(baseDegrees, octaveCount, steps) {
  const offsets = octaveOffsets(octaveCount, steps);
  const sequence = offsets.flatMap((offset) => baseDegrees.map((d) => d + offset));
  sequence.push(offsets[offsets.length - 1] + steps);
  return sequence;
}

function degreeFrequency(rootFreq, tuningKey, degree) {
  const { steps, ratios } = TUNINGS[tuningKey];
  const step = ((degree % steps) + steps) % steps;
  const octave = Math.floor(degree / steps);
  return rootFreq * ratios[step] * 2 ** octave;
}

// The reduced fraction for a degree under just/Pythagorean tuning (both are
// exact ratios by construction). Null for tunings with no clean fraction
// (equal temperament and the 24-tone Persian tuning are both irrational).
function exactFraction(tuningKey, degree) {
  const tuning = TUNINGS[tuningKey];
  if (!tuning.fractions) return null;
  const step = ((degree % tuning.steps) + tuning.steps) % tuning.steps;
  const octave = Math.floor(degree / tuning.steps);
  let [num, den] = tuning.fractions[step];
  if (octave > 0) num *= 2 ** octave;
  else if (octave < 0) den *= 2 ** -octave;
  const g = gcd(num, den);
  return [num / g, den / g];
}

function defaultIntervalDisplay(tuningKey) {
  return TUNINGS[tuningKey].fractions ? "ratio" : "cents";
}

// Interval label relative to the root, in whichever of the two representations
// is requested. Cents are exact for equal temperament (a tempered semitone is
// precisely 100 cents by definition, a Persian quarter tone precisely 50) and
// rounded for just/Pythagorean. Ratio mode falls back to a decimal multiplier
// for tunings with no exact fraction to show.
function intervalLabel(tuningKey, degree, mode) {
  const tuning = TUNINGS[tuningKey];
  const fraction = exactFraction(tuningKey, degree);
  if (mode === "cents") {
    if (fraction) return `${Math.round(1200 * Math.log2(fraction[0] / fraction[1]))}¢`;
    return `${Math.round((degree * 1200) / tuning.steps)}¢`;
  }
  if (fraction) return `${fraction[0]}/${fraction[1]}`;
  const step = ((degree % tuning.steps) + tuning.steps) % tuning.steps;
  const octave = Math.floor(degree / tuning.steps);
  return `×${(tuning.ratios[step] * 2 ** octave).toFixed(3)}`;
}

// --- Audio engine --------------------------------------------------------
//
// A fixed pool of oscillators is created once, up front, and left running
// permanently (silent, gain 0) — the same approach audio_fun used. Taps only
// retune an existing oscillator's frequency and ramp its gain, instead of
// constructing a brand-new oscillator/gain node graph on every touch. Building
// that graph fresh per tap (createOscillator + createGain + connect + start)
// was the main source of per-tap latency, especially pronounced on Firefox.

const VOICE_POOL_SIZE = 16;

let audioCtx = null;
let voicePool = [];

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
    voicePool = Array.from({ length: VOICE_POOL_SIZE }, () => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      gain.gain.value = 0;
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      return { osc, gain, busy: false, lastUsed: 0 };
    });
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function acquireVoice() {
  let voice = voicePool.find((v) => !v.busy);
  if (!voice) {
    // All voices busy (heavy multi-touch / overlapping scale playback) —
    // steal whichever voice has been playing longest.
    voice = voicePool.reduce((oldest, v) => (v.lastUsed < oldest.lastUsed ? v : oldest));
  }
  voice.busy = true;
  voice.lastUsed = performance.now();
  return voice;
}

let masterVolume = 0.35;

function startNote(freq) {
  const ctx = getAudioContext();
  const voice = acquireVoice();
  const now = ctx.currentTime;
  voice.osc.frequency.setValueAtTime(freq, now);
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(masterVolume, now + 0.008);
  return voice;
}

function stopNote(voice) {
  if (!voice) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + 0.05);
  voice.busy = false;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function playScaleSequence(freqs) {
  const sequence = [...freqs, ...freqs.slice(0, -1).reverse()];
  const noteLength = 150;
  for (const freq of sequence) {
    const voice = startNote(freq);
    await sleep(noteLength * 0.85);
    stopNote(voice);
    await sleep(noteLength * 0.15);
  }
}

// --- UI --------------------------------------------------------------

const rootSelect = document.getElementById("root-select");
const scaleSelect = document.getElementById("scale-select");
const octaveSlider = document.getElementById("octave-slider");
const octaveValueLabel = document.getElementById("octave-value");
const tuningGroup = document.getElementById("tuning-group");
const tuningHint = document.getElementById("tuning-hint");
const intervalDisplayGroup = document.getElementById("interval-display-group");
const volumeSlider = document.getElementById("volume-slider");
const notesEl = document.getElementById("notes");
const playScaleBtn = document.getElementById("play-scale");
const openOptionsBtn = document.getElementById("open-options");
const optionsDialog = document.getElementById("options-dialog");
const keyboardScrollbar = document.getElementById("keyboard-scrollbar");
const scrollbarThumb = document.getElementById("scrollbar-thumb");

// The keyboard always renders this many octaves' worth of buttons, scrollable
// left/right; `state.visibleOctaves` just controls how many of them are sized
// to fit on screen at once (i.e. how wide each button is), not how many exist.
const TOTAL_OCTAVE_RANGE = 9;

let state = {
  root: 0, // index into NOTE_NAMES
  tuning: "equal",
  scaleName: "Major (Ionian)",
  visibleOctaves: 2,
  intervalDisplay: defaultIntervalDisplay("equal"),
};

// Tracks the last tuning renderNotes() actually rendered with, so it can tell
// when the effective tuning changes (directly, or via a Chinese scale's lock)
// and reset the interval display to that tuning's natural default.
let lastEffectiveTuning = null;

let currentFrequencies = [];
const activeVoices = new Map(); // pointerId -> { voice, btn }

const INTERVAL_DISPLAY_OPTIONS = [
  { key: "ratio", label: "Ratios" },
  { key: "cents", label: "Cents" },
];

function populateIntervalDisplayGroup() {
  INTERVAL_DISPLAY_OPTIONS.forEach(({ key, label }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.dataset.key = key;
    btn.role = "radio";
    btn.addEventListener("click", () => {
      state.intervalDisplay = key;
      updateIntervalDisplayUI();
      refreshIntervalLabels();
    });
    intervalDisplayGroup.appendChild(btn);
  });
  updateIntervalDisplayUI();
}

function updateIntervalDisplayUI() {
  [...intervalDisplayGroup.children].forEach((b) => {
    b.setAttribute("aria-checked", b.dataset.key === state.intervalDisplay ? "true" : "false");
  });
}

// Updates just the ratio/cents text on already-rendered buttons, without
// rebuilding the row or resetting scroll position — used when only the
// interval display mode changes, since that shouldn't jump the keyboard.
function refreshIntervalLabels() {
  const { fixedTuning, groupName } = findScaleEntry(state.scaleName);
  const effectiveTuning = fixedTuning || state.tuning;
  const showChinese = groupName === "Chinese Pentatonic Modes";
  [...notesEl.children].forEach((btn) => {
    const degree = Number(btn.dataset.degree);
    const label = intervalLabel(effectiveTuning, degree, state.intervalDisplay);
    const ratioEl = btn.querySelector(".ratio");
    if (ratioEl) ratioEl.textContent = label;
    const nameText = btn.querySelector(".name")?.textContent ?? "";
    const hanziText = showChinese ? " " + (btn.querySelector(".hanzi")?.textContent ?? "") : "";
    const freqText = btn.querySelector(".freq")?.textContent ?? "";
    btn.setAttribute("aria-label", `${nameText}${hanziText}, ${label}, ${freqText}`);
  });
}

// Just resizes the buttons (via --visible-count) and the scroll thumb, both
// cheap, without rebuilding the row or touching scroll position — this is
// what runs on every tick of the octave slider, so it needs to stay smooth
// during a drag rather than doing a full render() per tick.
function updateVisibleCount() {
  const { degrees } = findScaleEntry(state.scaleName);
  notesEl.style.setProperty("--visible-count", state.visibleOctaves * degrees.length);
  updateScrollThumb();
}

function populateRootSelect() {
  NOTE_NAMES.forEach((name, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = name;
    rootSelect.appendChild(opt);
  });
  rootSelect.value = state.root;
}

function populateScaleSelect() {
  Object.entries(SCALE_GROUPS).forEach(([groupName, scales]) => {
    const group = document.createElement("optgroup");
    group.label = groupName;
    Object.keys(scales).forEach((scaleName) => {
      const opt = document.createElement("option");
      opt.value = scaleName;
      opt.textContent = scaleName;
      group.appendChild(opt);
    });
    scaleSelect.appendChild(group);
  });
  scaleSelect.value = state.scaleName;
}

// Tunings a scale can force via its `tuning` lock (see SCALE_GROUPS), keyed
// the same way, aren't necessarily meant to be picked directly by the user —
// persian24 only makes sense for scales already defined in quarter tones.
function populateTuningGroup() {
  Object.entries(TUNINGS).forEach(([key, { label, selectable }]) => {
    if (selectable === false) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label.replace(" Temperament", "").replace(" Intonation", "");
    btn.dataset.key = key;
    btn.role = "radio";
    btn.setAttribute("aria-checked", key === state.tuning ? "true" : "false");
    btn.addEventListener("click", () => {
      state.tuning = key;
      render();
    });
    tuningGroup.appendChild(btn);
  });
}

const TUNING_LOCK_MESSAGES = {
  pythagorean: "Locked to Pythagorean (3-limit) — the exact ratios Chinese pentatonic modes use.",
  persian24: "Locked to 24-tone equal temperament — the quarter tones Persian dastgahs use.",
};

function updateTuningUI(fixedTuning) {
  const activeKey = fixedTuning || state.tuning;
  [...tuningGroup.children].forEach((b) => {
    b.setAttribute("aria-checked", b.dataset.key === activeKey ? "true" : "false");
    b.disabled = Boolean(fixedTuning);
  });
  tuningHint.hidden = !fixedTuning;
  if (fixedTuning) tuningHint.textContent = TUNING_LOCK_MESSAGES[fixedTuning] ?? "";
}

// Half-flat (koron) mark for Persian quarter tones — see pitchLabel below.
const KORON = "↓";

// The note name for a degree, in whichever gamut the tuning uses. 12-step
// tunings map straight onto NOTE_NAMES. In the 24-step Persian tuning, even
// quarter-tone positions are the same 12 standard pitch classes, and odd
// (in-between) positions are labeled as the koron (half-flat) of the note
// above — the same convention Wikipedia's Dastgah article's note spellings
// use (e.g. "Ep" for E-koron), which is where this app's dastgah data comes
// from.
function pitchLabel(rootIndex, degree, steps) {
  if (steps !== 24) {
    const semitone = ((degree % steps) + steps) % steps;
    return NOTE_NAMES[(rootIndex + semitone) % 12];
  }
  const q = (((rootIndex * 2 + degree) % 24) + 24) % 24;
  if (q % 2 === 0) return NOTE_NAMES[(q / 2) % 12];
  return `${NOTE_NAMES[((q + 1) / 2) % 12]}${KORON}`;
}

function octaveLabel(degree, steps) {
  const octave = Math.floor(degree / steps);
  if (octave < 0) return String(octave);
  if (octave > 0) return `+${octave}`;
  return "";
}

// "Play scale" only plays roughly the currently-visible window (rounded to a
// whole number of octaves, since visibleOctaves is a continuous zoom level
// and "play half an extra octave" isn't a coherent run), not the whole
// scrollable range, so it stays a reasonable length. Kept separate from
// renderNotes() so it can be kept in sync on every octave-slider tick without
// a full DOM rebuild.
function updateCurrentFrequencies() {
  const { degrees, fixedTuning } = findScaleEntry(state.scaleName);
  const effectiveTuning = fixedTuning || state.tuning;
  const steps = TUNINGS[effectiveTuning].steps;
  const root = rootFrequency(state.root);
  const playOctaves = Math.max(1, Math.round(state.visibleOctaves));
  currentFrequencies = buildDegreeSequence(degrees, playOctaves, steps).map((d) =>
    degreeFrequency(root, effectiveTuning, d)
  );
}

function renderNotes() {
  const { degrees, fixedTuning, groupName } = findScaleEntry(state.scaleName);
  const effectiveTuning = fixedTuning || state.tuning;
  const steps = TUNINGS[effectiveTuning].steps;
  const showChinese = groupName === "Chinese Pentatonic Modes";
  const root = rootFrequency(state.root);

  if (effectiveTuning !== lastEffectiveTuning) {
    state.intervalDisplay = defaultIntervalDisplay(effectiveTuning);
    lastEffectiveTuning = effectiveTuning;
    updateIntervalDisplayUI();
  }

  // The full scrollable keyboard: a wide, fixed range of octaves.
  const degreeSeq = buildDegreeSequence(degrees, TOTAL_OCTAVE_RANGE, steps);
  const allFrequencies = degreeSeq.map((d) => degreeFrequency(root, effectiveTuning, d));

  updateCurrentFrequencies();
  updateTuningUI(fixedTuning);

  const notesPerOctave = degrees.length;
  notesEl.style.setProperty("--visible-count", state.visibleOctaves * notesPerOctave);

  notesEl.innerHTML = "";
  degreeSeq.forEach((degree, i) => {
    const freq = allFrequencies[i];
    const step = ((degree % steps) + steps) % steps;
    const btn = document.createElement("button");
    btn.className = "note-btn";
    btn.type = "button";
    btn.dataset.freq = String(freq);
    btn.dataset.degree = String(degree);
    if (step === 0) btn.classList.add("root");

    const octEl = document.createElement("span");
    octEl.className = "oct";
    octEl.textContent = octaveLabel(degree, steps);

    const nameEl = document.createElement("span");
    nameEl.className = "name";
    nameEl.textContent = pitchLabel(state.root, degree, steps);

    const hanziEl = document.createElement("span");
    hanziEl.className = "hanzi";
    hanziEl.textContent = CHINESE_NAMES[(state.root + step) % 12];

    const ratioEl = document.createElement("span");
    ratioEl.className = "ratio";
    ratioEl.textContent = intervalLabel(effectiveTuning, degree, state.intervalDisplay);

    const freqEl = document.createElement("span");
    freqEl.className = "freq";
    freqEl.textContent = `${freq.toFixed(1)} Hz`;

    btn.append(octEl, nameEl);
    if (showChinese) btn.append(hanziEl);
    btn.append(ratioEl, freqEl);

    btn.setAttribute(
      "aria-label",
      `${nameEl.textContent}${showChinese ? " " + hanziEl.textContent : ""}, ${ratioEl.textContent}, ${freqEl.textContent}`
    );

    notesEl.appendChild(btn);
  });

  scrollToVisibleWindow(notesPerOctave, steps);
  updateScrollThumb();
}

// Center the view on the root note by default, leaving the rest of
// TOTAL_OCTAVE_RANGE reachable by scrolling left/right. Independent of
// visibleOctaves (a continuous zoom level, not a window position) — zooming
// in or out shouldn't itself jump the scroll position.
function scrollToVisibleWindow(notesPerOctave, steps) {
  const totalOffsets = octaveOffsets(TOTAL_OCTAVE_RANGE, steps);
  const rootOffsetIndex = totalOffsets.indexOf(0);
  const rootButtonIndex = rootOffsetIndex * notesPerOctave;
  const target = notesEl.children[rootButtonIndex];
  if (target) notesEl.scrollLeft = target.offsetLeft + target.offsetWidth / 2 - notesEl.clientWidth / 2;
}

// --- Note interaction (tap-and-hold, drag-across-keys slur) --------------
//
// Handlers are delegated on the container (set up once) rather than attached
// per button, since buttons are recreated on every render anyway and dragging
// across them needs container-level tracking. Pointer capture is set on the
// container so a drag stays tracked even if it leaves the row's bounds; the
// element actually under the pointer is found via elementFromPoint on every
// move (e.target is *not* useful for this — capture redirects it to the
// original element), and switching to a new button swaps the sounding note,
// which is what makes dragging across keys play a slur.

function noteButtonAt(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  const btn = el?.closest(".note-btn");
  return btn && notesEl.contains(btn) ? btn : null;
}

function beginNoteOnPointer(pointerId, btn) {
  const freq = Number(btn.dataset.freq);
  const voice = startNote(freq);
  activeVoices.set(pointerId, { voice, btn });
  btn.classList.add("active");
}

function endNoteOnPointer(pointerId) {
  const active = activeVoices.get(pointerId);
  if (!active) return;
  stopNote(active.voice);
  active.btn.classList.remove("active");
  activeVoices.delete(pointerId);
}

notesEl.addEventListener("pointerdown", (e) => {
  const btn = e.target.closest(".note-btn");
  if (!btn) return;
  e.preventDefault();
  notesEl.setPointerCapture?.(e.pointerId);
  beginNoteOnPointer(e.pointerId, btn);
});

notesEl.addEventListener("pointermove", (e) => {
  const active = activeVoices.get(e.pointerId);
  if (!active) return;
  const btn = noteButtonAt(e.clientX, e.clientY);
  if (btn && btn !== active.btn) {
    endNoteOnPointer(e.pointerId);
    beginNoteOnPointer(e.pointerId, btn);
  }
});

// Pointer capture is the sole authority for ending a note — it keeps the note
// sustained even if a finger drifts slightly off a button during a hold,
// which `pointerleave` alone would otherwise cut off early on touch.
notesEl.addEventListener("pointerup", (e) => endNoteOnPointer(e.pointerId));
notesEl.addEventListener("pointercancel", (e) => endNoteOnPointer(e.pointerId));
notesEl.addEventListener("lostpointercapture", (e) => endNoteOnPointer(e.pointerId));
notesEl.addEventListener("contextmenu", (e) => e.preventDefault());

// --- Keyboard scrollbar ---------------------------------------------------
//
// Scrolling the keyboard only happens through this dedicated bar (or a
// desktop trackpad/wheel) — a drag directly on the keys is reserved for
// playing a slur instead, so `.note-btn` has touch-action: none.

function updateScrollThumb() {
  const trackWidth = keyboardScrollbar.clientWidth;
  const contentWidth = notesEl.scrollWidth;
  const viewWidth = notesEl.clientWidth;
  const thumbWidth = Math.max(24, Math.min(trackWidth, (viewWidth / contentWidth) * trackWidth));
  const maxScroll = Math.max(1, contentWidth - viewWidth);
  const scrollRatio = Math.min(1, notesEl.scrollLeft / maxScroll);
  const maxThumbLeft = trackWidth - thumbWidth;
  scrollbarThumb.style.width = `${thumbWidth}px`;
  scrollbarThumb.style.transform = `translateX(${scrollRatio * maxThumbLeft}px)`;
}

function scrollToTrackClientX(clientX) {
  const trackRect = keyboardScrollbar.getBoundingClientRect();
  const thumbWidth = scrollbarThumb.offsetWidth;
  const maxThumbLeft = trackRect.width - thumbWidth;
  const targetThumbLeft = Math.min(maxThumbLeft, Math.max(0, clientX - trackRect.left - thumbWidth / 2));
  const scrollRatio = maxThumbLeft > 0 ? targetThumbLeft / maxThumbLeft : 0;
  const maxScroll = notesEl.scrollWidth - notesEl.clientWidth;
  notesEl.scrollLeft = scrollRatio * maxScroll;
}

let draggingScrollbar = false;

keyboardScrollbar.addEventListener("pointerdown", (e) => {
  draggingScrollbar = true;
  keyboardScrollbar.setPointerCapture?.(e.pointerId);
  scrollToTrackClientX(e.clientX);
});
keyboardScrollbar.addEventListener("pointermove", (e) => {
  if (draggingScrollbar) scrollToTrackClientX(e.clientX);
});
const endScrollbarDrag = () => {
  draggingScrollbar = false;
};
keyboardScrollbar.addEventListener("pointerup", endScrollbarDrag);
keyboardScrollbar.addEventListener("pointercancel", endScrollbarDrag);
keyboardScrollbar.addEventListener("lostpointercapture", endScrollbarDrag);

notesEl.addEventListener("scroll", updateScrollThumb, { passive: true });
window.addEventListener("resize", updateScrollThumb);

function render() {
  renderNotes();
}

rootSelect.addEventListener("change", () => {
  state.root = Number(rootSelect.value);
  render();
});

scaleSelect.addEventListener("change", () => {
  state.scaleName = scaleSelect.value;
  render();
});

octaveSlider.addEventListener("input", () => {
  state.visibleOctaves = Number(octaveSlider.value);
  octaveValueLabel.textContent = state.visibleOctaves.toFixed(1);
  updateVisibleCount();
  updateCurrentFrequencies();
});

volumeSlider.addEventListener("input", () => {
  masterVolume = Number(volumeSlider.value);
});

playScaleBtn.addEventListener("click", async () => {
  playScaleBtn.disabled = true;
  try {
    await playScaleSequence(currentFrequencies);
  } finally {
    playScaleBtn.disabled = false;
  }
});

openOptionsBtn.addEventListener("click", () => optionsDialog.showModal());
optionsDialog.addEventListener("click", (e) => {
  if (e.target === optionsDialog) optionsDialog.close();
});

populateRootSelect();
populateScaleSelect();
octaveSlider.value = String(state.visibleOctaves);
octaveValueLabel.textContent = state.visibleOctaves.toFixed(1);
populateTuningGroup();
populateIntervalDisplayGroup();
volumeSlider.value = String(masterVolume);
render();
