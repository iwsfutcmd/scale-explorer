"use strict";

// --- Note & tuning data -----------------------------------------------
// Ported from audio_fun's Scales/ScaleKeyboard/ChineseKeyboard components.

const NOTE_NAMES = [
  "C", "C♯/D♭", "D", "D♯/E♭", "E", "F",
  "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B",
];

const TUNINGS = {
  equal: {
    label: "Equal Temperament",
    // 12-tone equal temperament: each step is the 12th root of 2.
    ratios: [...Array(12)].map((_, i) => 2 ** (i / 12)),
  },
  just: {
    label: "Just Intonation",
    // 5-limit just intonation ratios, from Scales.svelte / ScaleKeyboard.svelte.
    ratios: [
      1 / 1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3,
      7 / 5, 3 / 2, 8 / 5, 5 / 3, 16 / 9, 15 / 8,
    ],
  },
  pythagorean: {
    label: "Pythagorean (3-limit)",
    // 3-limit ratios (powers of 3 and 2), from ChineseKeyboard.svelte's exponentsChinese.
    ratios: [
      [0, 0], [7, 11], [2, 3], [9, 14], [4, 6], [11, 17],
      [6, 9], [1, 1], [8, 12], [3, 4], [10, 15], [5, 7],
    ].map(([p3, p2]) => 3 ** p3 / 2 ** p2),
  },
};

// Scale patterns as semitone offsets from the root.
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
  // rotations of the pentatonic scale, sound most authentic with Pythagorean tuning.
  "Chinese Pentatonic Modes": {
    "Gong 宮 (I)": [0, 2, 4, 7, 9],
    "Shang 商 (II)": [0, 2, 5, 7, 10],
    "Jue 角 (III)": [0, 3, 5, 8, 10],
    "Zhi 徵 (IV)": [0, 2, 5, 7, 9],
    "Yu 羽 (V)": [0, 3, 5, 7, 10],
  },
};

const REF_A4 = 440;
const A_INDEX = NOTE_NAMES.indexOf("A");

function rootFrequency(rootIndex) {
  return REF_A4 * 2 ** ((rootIndex - A_INDEX) / 12);
}

function scaleFrequencies(rootIndex, tuningKey, degrees) {
  const { ratios } = TUNINGS[tuningKey];
  const root = rootFrequency(rootIndex);
  const withOctave = [...degrees, 12]; // append the octave to complete the run
  return withOctave.map((d) => {
    const octave = Math.floor(d / 12);
    const semitone = d % 12;
    return root * ratios[semitone] * 2 ** octave;
  });
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
  gain.gain.linearRampToValueAtTime(masterVolume, now + 0.015);
  osc.start(now);
  return { osc, gain };
}

function stopNote(voice) {
  if (!voice) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + 0.08);
  voice.osc.stop(now + 0.1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function playScaleSequence(freqs) {
  const sequence = [...freqs, ...freqs.slice(0, -1).reverse()];
  const noteLength = 220;
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
const volumeSlider = document.getElementById("volume-slider");
const notesEl = document.getElementById("notes");
const playScaleBtn = document.getElementById("play-scale");

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
      [...tuningGroup.children].forEach((b) =>
        b.setAttribute("aria-checked", b.dataset.key === key ? "true" : "false")
      );
      render();
    });
    tuningGroup.appendChild(btn);
  });
}

function findScaleDegrees(scaleName) {
  for (const scales of Object.values(SCALE_GROUPS)) {
    if (scaleName in scales) return scales[scaleName];
  }
  return SCALE_GROUPS["Western"]["Major (Ionian)"];
}

function noteName(rootIndex, semitoneOffset) {
  return NOTE_NAMES[(rootIndex + semitoneOffset) % 12];
}

function renderNotes() {
  const degrees = findScaleDegrees(state.scaleName);
  currentFrequencies = scaleFrequencies(state.root, state.tuning, degrees);
  const labelDegrees = [...degrees, 12];

  notesEl.innerHTML = "";
  labelDegrees.forEach((degree, i) => {
    const freq = currentFrequencies[i];
    const btn = document.createElement("button");
    btn.className = "note-btn";
    btn.type = "button";
    if (degree === 0) btn.classList.add("root");
    if (degree === 12) btn.classList.add("octave");

    const degreeEl = document.createElement("span");
    degreeEl.className = "degree";
    degreeEl.textContent = degree === 12 ? String(labelDegrees.length) : String(i + 1);

    const nameEl = document.createElement("span");
    nameEl.className = "name";
    nameEl.textContent = noteName(state.root, degree);

    const freqEl = document.createElement("span");
    freqEl.className = "freq";
    freqEl.textContent = `${freq.toFixed(1)} Hz`;

    btn.append(degreeEl, nameEl, freqEl);
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
  btn.addEventListener("pointerleave", onUp);
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

populateRootSelect();
populateScaleSelect();
populateTuningGroup();
volumeSlider.value = String(masterVolume);
render();
