/* oxlint-disable */

const NOTES = [
  { sharp: 'do', flat: 'do' },
  { sharp: 'do#', flat: 'reb' },
  { sharp: 're', flat: 're' },
  { sharp: 're#', flat: 'mib' },
  { sharp: 'mi', flat: 'mi' },
  { sharp: 'fa', flat: 'fa' },
  { sharp: 'fa#', flat: 'solb' },
  { sharp: 'sol', flat: 'sol' },
  { sharp: 'sol#', flat: 'lab' },
  { sharp: 'la', flat: 'la' },
  { sharp: 'la#', flat: 'sib' },
  { sharp: 'si', flat: 'si' },
];

const NOTE_TO_INDEX = NOTES.reduce((acc, note, index) => {
  acc[note.sharp] = index;
  acc[note.flat] = index;
  return acc;
}, {});

// Upgraded Regex: Matches base note, then any order of a number and accidental.
// (?!\w) ensures it doesn't accidentally match words like "doing" or "solar".
const NOTE_REGEX = /\b(do|re|mi|fa|sol|la|si)([1-9]?)([#b]?)([1-9]?)(?!\w)/gi;

function parseNote(noteStr) {
  // Extract specific parts using exact matching
  const match = noteStr.match(/^(do|re|mi|fa|sol|la|si)([1-9]?)([#b]?)([1-9]?)$/i);
  if (!match) {
    return null;
  }

  const originalBase = match[1];
  const baseName = originalBase.toLowerCase();
  const num1 = match[2];
  const acc = match[3];
  const num2 = match[4];

  // Number could be before or after the accidental (fa2# or fa#2)
  const explicitOctave = num1 || num2;
  let octave = 1;

  if (explicitOctave) {
    octave = Number.parseInt(explicitOctave, 10);
  } else if (originalBase === originalBase.toUpperCase()) {
    octave = 3; // "DO" -> Octave 3
  } else if (originalBase[0] === originalBase[0].toUpperCase()) {
    octave = 2; // "Do" -> Octave 2
  }

  const normalizedName = baseName + acc;

  // Ensure the note exists (rejects false matches like "dob" safely)
  if (!(normalizedName in NOTE_TO_INDEX)) {
    return null;
  }

  let style = 'natural';
  if (acc === '#') {
    style = 'sharp';
  }
  if (acc === 'b') {
    style = 'flat';
  }

  return {
    name: normalizedName,
    octave,
    style,
    useCaps: !explicitOctave, // Flag to remember to output without numbers if possible
  };
}

function resolveStyle(index, originalStyle, options) {
  const forced = options[index] ?? options[`${index}`];
  if (forced === 'sharp' || forced === 'flat') {
    return forced;
  }
  if (options.default === 'sharp') {
    return 'sharp';
  }
  if (options.default === 'flat') {
    return 'flat';
  }
  return originalStyle;
}

function formatNote(index, octave, style, useCaps) {
  const note = NOTES[index];
  let name;
  switch (style) {
    case 'sharp': {
      name = note.sharp;
      break;
    }
    case 'flat': {
      name = note.flat;
      break;
    }
    default: {
      name = note.sharp === note.flat ? note.sharp : note.flat;
    }
  }

  // If user utilized capitalization logic instead of explicit numbers, respect it on output
  if (useCaps) {
    if (octave === 1) {
      return name.toLowerCase();
    }
    if (octave === 2) {
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
    if (octave === 3) {
      return name.toUpperCase();
    }
  }

  // Standard output format with numbers (used if user typed "fa2#" or it shifted to Octave 4+)
  return octave === 1 ? name.toLowerCase() : `${name.toLowerCase()}${octave}`;
}

function transposeNote(noteStr, shift, options = {}) {
  const parsed = parseNote(noteStr);

  // If unrecognized, return it exactly as is
  if (!parsed) {
    return noteStr;
  }

  const absolute = parsed.octave * 12 + NOTE_TO_INDEX[parsed.name] + shift;
  const octave = Math.floor(absolute / 12);
  const index = ((absolute % 12) + 12) % 12;

  const resolvedStyle = resolveStyle(index, parsed.style, options);

  return formatNote(index, octave, resolvedStyle, parsed.useCaps);
}

async function shiftSheet(sheet, shift, options = {}) {
  const normalized = sheet.replaceAll(String.raw`\n`, '\n').replaceAll(String.raw`\t`, '\t');
  const result = normalized.replace(NOTE_REGEX, (note) => transposeNote(note, shift, options));

  try {
    await navigator.clipboard.writeText(result);
    console.log('✅ Copied to clipboard');
  } catch (error) {
    console.warn('Clipboard unavailable', error);
  }

  return result;
}
