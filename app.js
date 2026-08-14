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
    // 12-tone equal temperament: each step is the 12th root of 2. Irrational —
    // no exact fraction, so `fractions` stays null.
    ratios: [...Array(12)].map((_, i) => 2 ** (i / 12)),
    fractions: null,
  },
  just: {
    label: "Just Intonation",
    // 5-limit just intonation ratios, from Scales.svelte / ScaleKeyboard.svelte.
    fractions: [
      [1, 1], [16, 15], [9, 8], [6, 5], [5, 4], [4, 3],
      [7, 5], [3, 2], [8, 5], [5, 3], [16, 9], [15, 8],
    ],
  },
  pythagorean: {
    label: "Pythagorean (3-limit)",
    // 3-limit ratios (powers of 3 and 2), from ChineseKeyboard.svelte's
    // exponentsChinese — also the exact ratios the Chinese pentatonic modes use.
    fractions: [
      [0, 0], [7, 11], [2, 3], [9, 14], [4, 6], [11, 17],
      [6, 9], [1, 1], [8, 12], [3, 4], [10, 15], [5, 7],
    ].map(([p3, p2]) => [3 ** p3, 2 ** p2]),
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

// Root octave, one octave down, one octave up, plus the closing note two
// octaves above the root — three octaves of the scale, start to finish.
function buildDegreeSequence(baseDegrees) {
  const octaveOffsets = [-12, 0, 12];
  const sequence = octaveOffsets.flatMap((offset) => baseDegrees.map((d) => d + offset));
  sequence.push(24);
  return sequence;
}

function degreeFrequency(rootFreq, tuningKey, degree) {
  const semitone = ((degree % 12) + 12) % 12;
  const octave = Math.floor(degree / 12);
  return rootFreq * TUNINGS[tuningKey].ratios[semitone] * 2 ** octave;
}

function scaleFrequencies(rootIndex, tuningKey, baseDegrees) {
  const root = rootFrequency(rootIndex);
  return buildDegreeSequence(baseDegrees).map((d) => degreeFrequency(root, tuningKey, d));
}

// Exact ratio label relative to the root: a reduced fraction for just/Pythagorean
// tuning, or a decimal multiplier for equal temperament (which is irrational).
function ratioLabel(tuningKey, degree) {
  const tuning = TUNINGS[tuningKey];
  const semitone = ((degree % 12) + 12) % 12;
  const octave = Math.floor(degree / 12);
  if (tuning.fractions) {
    let [num, den] = tuning.fractions[semitone];
    if (octave > 0) num *= 2 ** octave;
    else if (octave < 0) den *= 2 ** -octave;
    const g = gcd(num, den);
    return `${num / g}/${den / g}`;
  }
  return `×${(tuning.ratios[semitone] * 2 ** octave).toFixed(3)}`;
}

// --- Audio engine --------------------------------------------------------

let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

let masterVolume = 0.35;

function startNote(freq) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = 0;
  osc.connect(gain).connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.linearRampToValueAtTime(masterVolume, now + 0.008);
  osc.start(now);
  return { osc, gain };
}

function stopNote(voice) {
  if (!voice) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + 0.05);
  voice.osc.stop(now + 0.06);
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
const tuningGroup = document.getElementById("tuning-group");
const tuningHint = document.getElementById("tuning-hint");
const volumeSlider = document.getElementById("volume-slider");
const notesEl = document.getElementById("notes");
const playScaleBtn = document.getElementById("play-scale");
const openOptionsBtn = document.getElementById("open-options");
const optionsDialog = document.getElementById("options-dialog");

let state = {
  root: 0, // index into NOTE_NAMES
  tuning: "equal",
  scaleName: "Major (Ionian)",
};

let currentFrequencies = [];
const activeVoices = new Map(); // pointerId -> voice

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

function populateTuningGroup() {
  Object.entries(TUNINGS).forEach(([key, { label }]) => {
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

function updateTuningUI(fixedTuning) {
  const activeKey = fixedTuning || state.tuning;
  [...tuningGroup.children].forEach((b) => {
    b.setAttribute("aria-checked", b.dataset.key === activeKey ? "true" : "false");
    b.disabled = Boolean(fixedTuning);
  });
  tuningHint.hidden = !fixedTuning;
}

function noteName(rootIndex, semitoneOffset) {
  return NOTE_NAMES[(rootIndex + semitoneOffset) % 12];
}

function octaveLabel(degree) {
  const octave = Math.floor(degree / 12);
  if (octave < 0) return String(octave);
  if (octave > 0) return `+${octave}`;
  return "";
}

function renderNotes() {
  const { degrees, fixedTuning, groupName } = findScaleEntry(state.scaleName);
  const effectiveTuning = fixedTuning || state.tuning;
  const showChinese = groupName === "Chinese Pentatonic Modes";
  const degreeSeq = buildDegreeSequence(degrees);
  const root = rootFrequency(state.root);
  currentFrequencies = degreeSeq.map((d) => degreeFrequency(root, effectiveTuning, d));
  updateTuningUI(fixedTuning);

  notesEl.innerHTML = "";
  degreeSeq.forEach((degree, i) => {
    const freq = currentFrequencies[i];
    const semitone = ((degree % 12) + 12) % 12;
    const btn = document.createElement("button");
    btn.className = "note-btn";
    btn.type = "button";
    if (semitone === 0) btn.classList.add("root");

    const octEl = document.createElement("span");
    octEl.className = "oct";
    octEl.textContent = octaveLabel(degree);

    const nameEl = document.createElement("span");
    nameEl.className = "name";
    nameEl.textContent = noteName(state.root, degree);

    const hanziEl = document.createElement("span");
    hanziEl.className = "hanzi";
    hanziEl.textContent = CHINESE_NAMES[(state.root + semitone) % 12];

    const ratioEl = document.createElement("span");
    ratioEl.className = "ratio";
    ratioEl.textContent = ratioLabel(effectiveTuning, degree);

    const freqEl = document.createElement("span");
    freqEl.className = "freq";
    freqEl.textContent = `${freq.toFixed(1)} Hz`;

    btn.append(octEl, nameEl);
    if (showChinese) btn.append(hanziEl);
    btn.append(ratioEl, freqEl);

    btn.setAttribute(
      "aria-label",
      `${noteName(state.root, degree)}${showChinese ? " " + hanziEl.textContent : ""}, ${ratioEl.textContent}, ${freqEl.textContent}`
    );

    attachNoteHandlers(btn, () => freq);
    notesEl.appendChild(btn);
  });
}

function attachNoteHandlers(btn, getFreq) {
  const onDown = (e) => {
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    const voice = startNote(getFreq());
    activeVoices.set(e.pointerId, voice);
    btn.classList.add("active");
  };
  const onUp = (e) => {
    e.preventDefault();
    const voice = activeVoices.get(e.pointerId);
    if (voice) {
      stopNote(voice);
      activeVoices.delete(e.pointerId);
    }
    btn.classList.remove("active");
  };
  btn.addEventListener("pointerdown", onDown);
  btn.addEventListener("pointerup", onUp);
  btn.addEventListener("pointercancel", onUp);
  // Pointer capture (set on pointerdown) is the source of truth for release —
  // it keeps the note sustained even if a finger drifts off the button during
  // a hold, which `pointerleave` alone would otherwise cut off early on touch.
  btn.addEventListener("lostpointercapture", onUp);
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
}

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
populateTuningGroup();
volumeSlider.value = String(masterVolume);
render();
