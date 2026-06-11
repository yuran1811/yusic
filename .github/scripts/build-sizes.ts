/* oxlint-disable no-magic-numbers, radix */
import { $, Glob } from 'bun';

async function dirSize(path: string, exclude?: string): Promise<number> {
  try {
    if (exclude) {
      const glob = new Glob(`**/*`);
      const excludeGlob = new Glob(exclude);
      let total = 0;
      for await (const entry of glob.scan({ cwd: path, dot: true })) {
        if (excludeGlob.match(entry)) continue;
        const stat = Bun.file(`${path}/${entry}`);
        total += stat.size;
      }
      return total;
    }
    const result = await $`du -sk ${path}`.quiet();
    return Number.parseInt(result.text().split('\t')[0]) * 1024;
  } catch {
    return 0;
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Configurable groups of packages to monitor. Each group will be printed
// with the first row showing the package label (e.g. `@api/hono`) and
// subsequent rows using an empty first column to visually group entries.
const monitorGroups: Array<{
  label: string;
  items: Array<{
    serve: string;
    // single path to measure, optional when using `aggregate`
    path?: string;
    exclude?: string;
    // aggregate is an array of paths whose sizes should be summed
    aggregate?: string[];
  }>;
}> = [
  {
    label: '@yusic/swift',
    items: [
      { serve: 'dist', path: 'apps/swift/dist', exclude: '*.d.mts' },
      { serve: 'build *', path: 'apps/swift/.build' },
    ],
  },
  {
    label: '@yusic/doc',
    items: [
      { serve: 'standalone', path: 'apps/doc/.next/standalone' },
      { serve: 'static', path: 'apps/doc/.next/static' },
      {
        serve: 'standalone + static *',
        aggregate: ['apps/doc/.next/standalone', 'apps/doc/.next/static'],
      },
    ],
  },
];

// Flatten monitor tasks and compute sizes (parallel where possible)
type Task = { groupIndex: number; itemIndex: number; compute: () => Promise<number> };
const tasks: Task[] = [];
for (let gi = 0; gi < monitorGroups.length; gi++) {
  const group = monitorGroups[gi];
  for (let ii = 0; ii < group.items.length; ii++) {
    const it = group.items[ii];
    if (it.aggregate) {
      tasks.push({
        groupIndex: gi,
        itemIndex: ii,
        compute: async () => {
          const sizes = await Promise.all(it.aggregate!.map((p) => dirSize(p)));
          return sizes.reduce((a, b) => a + b, 0);
        },
      });
    } else if (it.path) {
      tasks.push({
        groupIndex: gi,
        itemIndex: ii,
        compute: async () => dirSize(it.path!, it.exclude),
      });
    } else {
      // fallback zero
      tasks.push({ groupIndex: gi, itemIndex: ii, compute: async () => 0 });
    }
  }
}

const sizesByGroup: number[][] = monitorGroups.map((g) => new Array(g.items.length).fill(0));
await Promise.all(
  tasks.map(async (t) => {
    const size = await t.compute();
    sizesByGroup[t.groupIndex][t.itemIndex] = size;
  }),
);

const rows: string[][] = [];
for (let gi = 0; gi < monitorGroups.length; gi++) {
  const group = monitorGroups[gi];
  for (let ii = 0; ii < group.items.length; ii++) {
    const firstCol = ii === 0 ? group.label : '';
    rows.push([firstCol, group.items[ii].serve, formatSize(sizesByGroup[gi][ii])]);
  }
  // insert an empty separator row marker between groups (we'll use it when printing)
  if (gi < monitorGroups.length - 1) rows.push(['__GROUP_SEP__', '', '']);
}

// Remove trailing separator if present
if (rows.length && rows.at(-1)?.[0] === '__GROUP_SEP__') rows.pop();

const widths = [0, 0, 0];
for (const row of rows) {
  // skip our separator marker when computing column widths
  if (row[0] === '__GROUP_SEP__') continue;
  for (let i = 0; i < row.length; i++) widths[i] = Math.max(widths[i], row[i].length);
}

const line = (l: string, m: string, r: string) =>
  `${l}${'─'.repeat(widths[0] + 2)}${m}${'─'.repeat(widths[1] + 2)}${m}${'─'.repeat(widths[2] + 2)}${r}`;

const fmtRow = (row: string[]) =>
  `│ ${row[0].padEnd(widths[0])} │ ${row[1].padEnd(widths[1])} │ ${row[2].padStart(widths[2])} │`;

console.log(line('┌', '┬', '┐'));
console.log(
  `│ ${'App'.padEnd(widths[0])} │ ${'Serve'.padEnd(widths[1])} │ ${'Size'.padStart(widths[2])} │`,
);
console.log(line('├', '┼', '┤'));
for (const row of rows) {
  if (row[0] === '__GROUP_SEP__') console.log(line('├', '┼', '┤'));
  else console.log(fmtRow(row));
}

console.log(line('└', '┴', '┘'));
