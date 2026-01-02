const notes = ["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"];

let currentProgression = null;
let selectedProgressionIndex = null;
let savedProgressions =
  JSON.parse(localStorage.getItem("progressions")) || [];

let expectedNotes = [];
let selectedNotes = [];

/* ---------- METRONOME ---------- */

let tempo = 100;
let metroInterval = null;
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function updateTempo(val) {
  tempo = Number(val);
  document.getElementById("tempoValue").innerText = tempo;
  if (metroInterval) toggleMetronome(true);
}

function toggleMetronome(restart = false) {
  if (metroInterval && !restart) {
    clearInterval(metroInterval);
    metroInterval = null;
    return;
  }
  clearInterval(metroInterval);
  metroInterval = setInterval(playClick, (60 / tempo) * 1000);
}

function playClick() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = 1000;
  gain.gain.value = 0.1;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

/* ---------- GENERATE CHORDS ---------- */

function generateChords() {
  removeRecallUI();

  const root = notes[Math.floor(Math.random() * notes.length)];
  const index = notes.indexOf(root);

  const scaleChords = [
    root + " major",
    notes[(index + 2) % 12] + " minor",
    notes[(index + 4) % 12] + " minor",
    notes[(index + 5) % 12] + " major",
    notes[(index + 7) % 12] + " major",
    notes[(index + 9) % 12] + " minor",
    notes[(index + 11) % 12] + " dim",
  ];

  const progression = [];
  while (progression.length < 4) {
    const c = scaleChords[Math.floor(Math.random() * scaleChords.length)];
    if (!progression.includes(c)) progression.push(c);
  }

  currentProgression = {
    name: "Untitled Progression",
    root,
    key: `${root} major / ${notes[(index - 3 + 12) % 12]} minor`,
    chords: progression,
    notes: ""
  };

  expectedNotes = [
    root,
    notes[(index + 2) % 12],
    notes[(index + 4) % 12],
    notes[(index + 5) % 12],
    notes[(index + 7) % 12],
    notes[(index + 9) % 12],
    notes[(index + 11) % 12],
  ];

  selectedNotes = [];
  selectedProgressionIndex = null;

  document.getElementById("output").innerText =
`Key: ${currentProgression.key}

Chords:
${currentProgression.chords.join(", ")}`;

  injectRecallUI();
}

/* ---------- BUILD CHORD ---------- */

function buildChord() {
  if (!currentProgression) return alert("Generate chords first.");

  const root = currentProgression.root;
  const idx = notes.indexOf(root);

  document.getElementById("output").innerText =
`Build chords in ${root}

Major: ${root}, ${notes[(idx + 4) % 12]}, ${notes[(idx + 7) % 12]}
Minor: ${root}, ${notes[(idx + 3) % 12]}, ${notes[(idx + 7) % 12]}`;
}

/* ---------- ACTIVE RECALL UI ---------- */

function injectRecallUI() {
  removeRecallUI();

  const container = document.createElement("div");
  container.id = "recallContainer";

  const title = document.createElement("h3");
  title.innerText = "🔓 Unlock the fretboard";

  const hint = document.createElement("p");
  hint.innerText = "See all notes in the key on the guitar";

  const obj = document.createElement("object");
  obj.type = "image/svg+xml";
  obj.data = "./fretboard.svg";
  obj.style.width = "100%";
  obj.style.marginTop = "15px";

  obj.onload = () => attachFretboardHandlers(obj);

  const btn = document.createElement("button");
  btn.innerText = "Check Chords";
  btn.onclick = unlockChords;

  const feedback = document.createElement("p");
  feedback.id = "recallFeedback";

  container.append(title, hint, obj, btn, feedback);
  document.querySelector(".container").appendChild(container);
}

function attachFretboardHandlers(obj) {
  const svgDoc = obj.contentDocument;
  if (!svgDoc) return;

  const notesEls = svgDoc.querySelectorAll(".fret-note");

  notesEls.forEach(el => {
    el.addEventListener("click", () => {
      const note = el.dataset.note;
      el.classList.toggle("selected");

      if (selectedNotes.includes(note)) {
        selectedNotes = selectedNotes.filter(n => n !== note);
      } else {
        selectedNotes.push(note);
      }
    });
  });
}

function checkRecall() {
  const correct =
    expectedNotes.every(n => selectedNotes.includes(n)) &&
    selectedNotes.every(n => expectedNotes.includes(n));

  const fb = document.getElementById("recallFeedback");

  if (correct) {
    fb.innerText = "✅ Correct — chord diagrams unlocked";
    unlockChords();
  } else {
    fb.innerText = "❌ Not quite — try again";
  }
}

function unlockChords() {
  if (document.getElementById("chordDiagrams")) return;

  const diagrams = document.createElement("div");
  diagrams.id = "chordDiagrams";

  const title = document.createElement("h3");
  title.innerText = "🎸 Chord Diagrams";
  diagrams.appendChild(title);

   // Add whiteish-grey background and some padding
  diagrams.style.backgroundColor = "#708090"; // light grey
  diagrams.style.padding = "15px";
  diagrams.style.borderRadius = "8px";
  diagrams.style.gap = "8px";

  currentProgression.chords.forEach(chord => {
    const img = document.createElement("img");
    img.src = `./${encodeURIComponent(chord.replace(/\s+/g, "_"))}.svg`;
    img.style.width = "120px";
    img.style.margin = "8px";
    img.title = chord;
    diagrams.appendChild(img);
  });

  document.querySelector(".container").appendChild(diagrams);
}


function removeRecallUI() {
  ["recallContainer", "chordDiagrams"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

/* ---------- SAVE / DELETE ---------- */

function saveProgression() {
  if (!currentProgression) return alert("Nothing to save.");

  const name = prompt("Name this progression:", currentProgression.name);
  if (!name) return;

  const practiceNotes = prompt("Practice notes (optional):", "");

  currentProgression.name = name;
  currentProgression.notes = practiceNotes || "";

  savedProgressions.push({ ...currentProgression });
  localStorage.setItem("progressions", JSON.stringify(savedProgressions));
  renderSaved();
}

function renderSaved() {
  const list = document.getElementById("savedList");
  list.innerHTML = "";

  savedProgressions.forEach((p, i) => {
    const li = document.createElement("li");

    const label = document.createElement("span");
    label.innerText = p.name;
    label.onclick = () => renderSavedDetails(p);

    const del = document.createElement("button");
    del.innerText = "🗑";
    del.onclick = e => {
      e.stopPropagation();
      savedProgressions.splice(i, 1);
      localStorage.setItem("progressions", JSON.stringify(savedProgressions));
      renderSaved();
      document.getElementById("output").innerText = "";
    };

    li.append(label, del);
    list.appendChild(li);
  });
}

function renderSavedDetails(p) {
  document.getElementById("output").innerText =
`Saved: ${p.name}

Key:
${p.key}

Chords:
${p.chords.join(", ")}

Practice notes:
${p.notes || "—"}`;
}

/* ---------- MIDI EXPORT ---------- */

function noteWithOctave(note, octave = 4) {
  return note + octave;
}

function exportMidi() {
  const source = currentProgression;
  if (!source) return alert("Nothing to export.");

  const track = new MidiWriter.Track();
  track.setTempo(tempo);

  source.chords.forEach(chord => {
    const root = chord.split(" ")[0];
    const idx = notes.indexOf(root);

    const pitches = [
      noteWithOctave(notes[idx]),
      noteWithOctave(notes[(idx + 4) % 12]),
      noteWithOctave(notes[(idx + 7) % 12])
    ];

    track.addEvent(new MidiWriter.NoteEvent({
      pitch: pitches,
      duration: "2"
    }));
  });

  const writer = new MidiWriter.Writer(track);
  const blob = new Blob([writer.buildFile()], { type: "audio/midi" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${source.name.replace(/\s+/g, "_")}.mid`;
  a.click();
}
