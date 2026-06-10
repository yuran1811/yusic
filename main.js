const NOTES = [
  { sharp: "do", flat: "do" }, // 0
  { sharp: "do#", flat: "reb" }, // 1
  { sharp: "re", flat: "re" }, // 2
  { sharp: "re#", flat: "mib" }, // 3
  { sharp: "mi", flat: "mi" }, // 4
  { sharp: "fa", flat: "fa" }, // 5
  { sharp: "fa#", flat: "solb" }, // 6
  { sharp: "sol", flat: "sol" }, // 7
  { sharp: "sol#", flat: "lab" }, // 8
  { sharp: "la", flat: "la" }, // 9
  { sharp: "la#", flat: "sib" }, // 10
  { sharp: "si", flat: "si" }, // 11
];

const NOTE_TO_INDEX = NOTES.reduce((acc, note, index) => {
  acc[note.sharp] = index;
  acc[note.flat] = index;
  return acc;
}, {});

const NOTE_REGEX = /\b(do#?|reb|re#?|mib|mi|fa#?|solb|sol#?|lab|la#?|sib|si)(\d*)\b/gi;

function getInputStyle(note) {
  if (note.includes("#")) return "sharp";
  if (note.endsWith("b")) return "flat";
  return "natural";
}

function parseNote(note) {
  const match = note.match(/^(do#?|reb|re#?|mib|mi|fa#?|solb|sol#?|lab|la#?|sib|si)(\d*)$/i);

  if (!match) return null;

  return {
    name: match[1].toLowerCase(),
    octave: Number(match[2] || 1),
    style: getInputStyle(match[1].toLowerCase()),
  };
}

function resolveStyle(index, originalStyle, options) {
  const forced = options[index];

  if (forced === "sharp" || forced === "flat") {
    return forced;
  }

  if (options.default === "sharp") {
    return "sharp";
  }

  if (options.default === "flat") {
    return "flat";
  }

  return originalStyle;
}

function formatNote(index, octave, style) {
  const note = NOTES[index];

  let name;

  switch (style) {
    case "sharp":
      name = note.sharp;
      break;

    case "flat":
      name = note.flat;
      break;

    default:
      name = note.sharp === note.flat ? note.sharp : note.flat;
  }

  return octave === 1 ? name : `${name}${octave}`;
}

function transposeNote(note, shift, options = {}) {
  const parsed = parseNote(note);

  if (!parsed) {
    return note;
  }

  const absolute = parsed.octave * 12 + NOTE_TO_INDEX[parsed.name] + shift;

  const octave = Math.floor(absolute / 12);
  const index = ((absolute % 12) + 12) % 12;

  const style = resolveStyle(index, parsed.style, options);

  return formatNote(index, octave, style);
}

async function shiftSheet(sheet, shift, options = {}) {
  const normalized = sheet.replace(/\\n/g, "\n").replace(/\\t/g, "\t");

  const result = normalized.replace(NOTE_REGEX, (note) => transposeNote(note, shift, options));

  try {
    await navigator.clipboard.writeText(result);
    console.log("✅ Copied to clipboard");
  } catch (err) {
    console.warn("Clipboard unavailable", err);
  }

  return result;
}
