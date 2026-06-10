#!/usr/bin/env node

import type { OptionValues } from 'commander';

import fs from 'node:fs';
import path from 'node:path';

import { intro, outro, text, select, isCancel, cancel, spinner } from '@clack/prompts';
import { program } from 'commander';
import pc from 'picocolors';

interface CLIOptions extends OptionValues {
  style?: 'sharp' | 'flat' | 'auto';
  shift?: string;
  input?: string;
  output?: string;
  overrides?: string;
  interactive?: boolean;
}

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

const NOTE_TO_INDEX = NOTES.reduce<Record<string, number>>((acc, note, index) => {
  acc[note.sharp] = index;
  acc[note.flat] = index;
  return acc;
}, {});

// Matches base note, then any order of a number and accidental.
const NOTE_REGEX = /\b(do|re|mi|fa|sol|la|si)([1-9]?)([#b]?)([1-9]?)(?!\w)/giu;

function parseNote(noteStr: string) {
  const match = /^(do|re|mi|fa|sol|la|si)([1-9]?)([#b]?)([1-9]?)$/iu.exec(noteStr);
  if (!match) {
    return null;
  }

  const originalBase = match?.[1];
  const baseName = originalBase.toLowerCase();
  const num1 = match?.[2];
  const acc = match?.[3];
  const num2 = match?.[4];

  const explicitOctave = num1 || num2;
  let octave = 1;

  if (explicitOctave) {
    octave = Number.parseInt(explicitOctave, 10);
  } else if (originalBase === originalBase.toUpperCase()) {
    octave = 3; // "DO" -> Octave 3
  } else if (originalBase?.[0].startsWith(originalBase[0].toUpperCase())) {
    octave = 2; // "Do" -> Octave 2
  }

  const normalizedName = baseName + acc;

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
  };
}

function resolveStyle(index: number, originalStyle: string, options: Record<string, string>) {
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

function formatNote(index: number, octave: number, style: string) {
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

  // Consistent numeric style format: ALWAYS lowercase, explicit numbers for octave > 1
  return octave === 1 ? name : `${name}${octave}`;
}

function transposeNote(noteStr: string, shift: number, options: Record<string, string> = {}) {
  const parsed = parseNote(noteStr);

  if (!parsed) {
    return noteStr;
  }

  const absolute = parsed.octave * 12 + NOTE_TO_INDEX[parsed.name] + shift;
  const octave = Math.floor(absolute / 12);
  const index = ((absolute % 12) + 12) % 12;

  const resolvedStyle = resolveStyle(index, parsed.style, options);

  return formatNote(index, octave, resolvedStyle);
}

function shiftSheet(sheet: string, shift: number, options: Record<string, string> = {}) {
  const normalized = sheet.replaceAll(String.raw`\n`, '\n').replaceAll(String.raw`\t`, '\t');
  return normalized.replace(NOTE_REGEX, (note) => transposeNote(note, shift, options));
}

// --- CLI Handlers ---

function checkCancel<T>(val: T | symbol) {
  if (isCancel(val)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }
  return val;
}

function parseOverrides(input: string) {
  if (!input) {
    return {};
  }

  try {
    if (input.trim().startsWith('{')) {
      return JSON.parse(input) as Record<string, string>;
    }
  } catch {
    // Fallthrough to manual string parsing if JSON fails
  }

  const overrides: Record<string, string> = {};
  input.split(',').forEach((pair) => {
    const [key, val] = pair.split(/[:=]/u).map((s) => s.trim());
    if (key && (val === 'sharp' || val === 'flat')) {
      const num = Number.parseInt(key, 10);
      if (!Number.isNaN(num) && num >= 0 && num <= 11) {
        overrides[num] = val;
      }
    }
  });

  return overrides;
}

// 1. Interactive Mode (Clack)
async function runInteractiveMode() {
  console.clear();
  intro(`${pc.bgCyan(pc.black(' 🎵 Sheet Music Transposer '))} `);

  const inputMode = checkCancel(
    await select({
      message: 'How would you like to provide the sheet music?',
      options: [
        { value: 'text', label: 'Type or paste notes directly' },
        { value: 'file', label: 'Read from a text file' },
      ],
    }),
  );

  let sheetText = '';
  if (inputMode === 'file') {
    const filePath = checkCancel(
      await text({
        message: 'Enter the path to your text file:',
        placeholder: './song.txt',
        validate: (val) => (val && fs.existsSync(val) ? undefined : 'File not found.'),
      }),
    );
    sheetText = filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  } else {
    sheetText = checkCancel(
      await text({ message: 'Paste or type your notes:', placeholder: 'do re mi fa sol...' }),
    );
  }

  const shiftStr = checkCancel(
    await text({
      message: 'How many semitones to shift?',
      placeholder: '(e.g., 2 for up, -2 for down)',
      validate: (val) =>
        Number.isNaN(Number.parseInt(val ?? '0', 10)) ? 'Please enter a valid number.' : undefined,
    }),
  );

  const style = checkCancel(
    await select({
      message: 'Select global note notation style:',
      options: [
        { value: 'auto', label: 'Keep original style (Auto)' },
        { value: 'sharp', label: 'Force Sharps (#)' },
        { value: 'flat', label: 'Force Flats (b)' },
      ],
    }),
  );

  const wantsOverrides = checkCancel(
    await select({
      message: 'Do you want to add specific note style overrides? (e.g. index 11 always flat)',
      options: [
        { value: false, label: 'No' },
        { value: true, label: 'Yes' },
      ],
    }),
  );

  let overridesConfig = {};
  if (wantsOverrides) {
    const overridesStr = checkCancel(
      await text({
        message: 'Enter overrides (format: index:style, e.g., 11:flat, 6:sharp):',
        placeholder: '11:flat',
      }),
    );
    overridesConfig = parseOverrides(overridesStr);
  }

  const outputMode = checkCancel(
    await select({
      message: 'Where should we output the result?',
      options: [
        { value: 'console', label: 'Print to console' },
        { value: 'file', label: 'Save to a file' },
      ],
    }),
  );

  let outPath = null;
  if (outputMode === 'file') {
    outPath = checkCancel(
      await text({ message: 'Enter destination file path:', placeholder: './transposed.txt' }),
    );
  }

  const s = spinner();
  s.start('Transposing...');
  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });

  const finalOptions = {
    ...(style === 'auto' ? {} : { default: style }),
    ...overridesConfig,
  };

  const result = shiftSheet(sheetText, Number.parseInt(shiftStr, 10), finalOptions);
  s.stop('Complete!');

  if (outPath && outputMode === 'file') {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, result);
    outro(`✅ Saved to ${pc.green(outPath)}`);
  } else {
    console.log(`\n${pc.cyan('╭─── Transposed Notes ─────────────────────────────────╮')}`);
    console.log(result);
    console.log(`${pc.cyan('╰──────────────────────────────────────────────────────╯')}\n`);
    outro('All done! 🎹');
  }
}

// 2. Fast / CLI Args Mode
function runFastMode(options: CLIOptions, pipedData: string | null = null) {
  const shift = Number.parseInt(options?.shift ?? '0', 10);
  if (Number.isNaN(shift)) {
    console.error(pc.red('Error: --shift (-s) must be a valid integer.'));
    process.exit(1);
  }

  let sheetText = '';
  if (pipedData) {
    sheetText = pipedData;
  } else if (options.input) {
    try {
      sheetText =
        fs.existsSync(options.input) && fs.lstatSync(options.input).isFile()
          ? fs.readFileSync(options.input, 'utf8')
          : options.input;
    } catch {
      sheetText = options.input;
    }
  } else {
    console.error(pc.red('Error: Missing input. Use -i <text/file> or pipe data in.'));
    process.exit(1);
  }

  const shiftOptions = {
    ...(options.style === 'auto' ? {} : { default: options.style }),
    ...parseOverrides(options.overrides ?? ''),
  };

  const result = shiftSheet(sheetText, shift, shiftOptions);

  if (options.output) {
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, result);
    console.log(pc.green(`✅ Transposed and saved to ${options.output}`));
  } else {
    process.stdout.write(result + (pipedData === null ? '' : '\n'));
  }
}

// --- Main Execution ---
function main() {
  program
    .name('transpose')
    .description('CLI tool to transpose solfege sheet music')
    .version('1.0.0')
    .option('-s, --shift <number>', 'Number of semitones to shift (e.g. 2, -1)')
    .option('-i, --input <string>', 'Input text or path to text file')
    .option('-o, --output <path>', 'Output file path (prints to console if omitted)')
    .option('--style <type>', 'Force global note style: "sharp", "flat", or "auto"', 'auto')
    .option(
      '--overrides <config>',
      'Specific note style overrides (e.g. "11:flat,6:sharp" or JSON)',
    )
    .option('--interactive', 'Force the interactive wizard mode');

  program.parse(process.argv);
  const options = program.opts();

  if (!process.stdin.isTTY) {
    let pipedData = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (pipedData += chunk.toString()));
    process.stdin.on('end', () => {
      runFastMode(options, pipedData);
    });
    return;
  }

  if (process.argv.length <= 2 || options.interactive) {
    runInteractiveMode().catch(console.error);
  } else {
    if (!options.shift && process.argv.length > 2) {
      console.error(pc.red('Error: You must provide a shift amount.'));
      program.outputHelp();
      process.exit(1);
    }
    runFastMode(options);
  }
}

main();
