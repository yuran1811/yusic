#!/usr/bin/env node

const fs = require("fs");

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

// Removed async and browser clipboard APIs. It now directly returns the result.
function shiftSheet(sheet, shift, options = {}) {
  const normalized = sheet.replace(/\\n/g, "\n").replace(/\\t/g, "\t");

  return normalized.replace(NOTE_REGEX, (note) => transposeNote(note, shift, options));
}

// --- CLI Execution Logic ---
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: node transpose.js <shift_amount> <sheet_text_or_file_path> [default_style]",
    );
    console.error("Example: node transpose.js 2 'do re mi' sharp");
    process.exit(1);
  }

  const shift = parseInt(args[0], 10);
  if (isNaN(shift)) {
    console.error("Error: <shift_amount> must be a valid integer.");
    process.exit(1);
  }

  const input = args[1];
  let sheetText = input;

  // If the input string matches a file path, read the file instead
  try {
    if (fs.existsSync(input) && fs.lstatSync(input).isFile()) {
      sheetText = fs.readFileSync(input, "utf-8");
    }
  } catch (err) {
    // Ignore errors here; we'll fallback to treating it as a literal string
  }

  // Optional: pass 'sharp' or 'flat' to enforce styling via CLI
  const options = args[2] ? { default: args[2] } : {};

  const result = shiftSheet(sheetText, shift, options);

  // Output the result to standard out
  console.log(result);
}

main();
