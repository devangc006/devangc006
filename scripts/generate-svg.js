#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const inputPath = process.argv[2] || "data/contributions.json";
const outputPath = process.argv[3] || "assets/contribution-terminal.svg";
const data = JSON.parse(await fs.readFile(inputPath, "utf8"));
const weeks = (data.weeks || []).slice(-53);
while (weeks.length < 53) weeks.unshift([]);
for (const week of weeks) while (week.length < 7) week.push(null);

const esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
}[character]));
const max = Math.max(1, ...weeks.flat().filter(Boolean).map((day) => day.count));
const level = (count) => count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
const cells = weeks.map((week, column) => week.map((day, row) => {
  const count = day?.count || 0;
  const delay = (column * 7 + row) * 0.018;
  return `<rect class="cell level-${level(count)}" x="${column * 12}" y="${row * 12}" width="9" height="9" rx="2" style="animation-delay:${(4.1 + delay).toFixed(3)}s"><title>${esc(day?.date || "No date")}: ${count} contribution${count === 1 ? "" : "s"}</title></rect>`;
}).join("")).join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="390" viewBox="0 0 800 390" role="img" aria-labelledby="title desc">
  <title id="title">GitHub contribution activity for @${esc(data.username)}</title>
  <desc id="desc">${esc(data.totalContributions)} contributions over the last year, displayed in an animated Linux terminal.</desc>
  <style>
    text { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 13px; dominant-baseline: middle; }
    .terminal { fill:#0a0a0b; }
    .primary { fill:#E6EDF3; } .muted { fill:#6E7681; } .accent { fill:#00FF9C; }
    .line { opacity:0; animation: reveal 14s ease-in-out infinite; }
    .line-1 { animation-delay:.25s; } .line-2 { animation-delay:1.1s; }
    .line-3 { animation-delay:1.9s; } .line-4 { animation-delay:2.7s; }
    .graph { opacity:0; animation: graph-in 14s ease-in-out infinite; }
    .cell { fill:#161B22; opacity:0; animation: cell-in 14s ease-out infinite; }
    .level-1 { fill:#064E3B; } .level-2 { fill:#059669; } .level-3 { fill:#00D084; } .level-4 { fill:#00FF9C; }
    .stats { opacity:0; animation: reveal 14s ease-in-out 10.8s infinite; }
    .cursor { animation: blink 1s steps(1,end) infinite; }
    .scanlines { pointer-events:none; opacity:.045; }
    @keyframes reveal { 0%,4% { opacity:0 } 9%,88% { opacity:1 } 94%,100% { opacity:0 } }
    @keyframes graph-in { 0%,27% { opacity:0 } 31%,88% { opacity:1 } 94%,100% { opacity:0 } }
    @keyframes cell-in { 0%,28% { opacity:0; transform:translateY(2px) } 32%,88% { opacity:1; transform:translateY(0) } 94%,100% { opacity:0 } }
    @keyframes blink { 0%,49% { opacity:1 } 50%,100% { opacity:0 } }
    @media (prefers-reduced-motion: reduce) { .line,.graph,.cell,.stats { animation:none; opacity:1; } .cursor { animation:none; } }
  </style>
  <defs>
    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0H4" stroke="#E6EDF3" stroke-width="1"/></pattern>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="800" height="390" rx="14" class="terminal"/>
  <g opacity="0.5"><circle cx="24" cy="24" r="6" fill="#ff5f57"/><circle cx="44" cy="24" r="6" fill="#febc2e"/><circle cx="64" cy="24" r="6" fill="#28c840"/></g>
  <text x="400" y="28" text-anchor="middle" font-size="11" class="muted">~ / github.sh</text>
  <g font-size="13">
    <g class="line line-1"><text x="40" y="64" class="accent">$</text><text x="60" y="64" class="primary">git activity --graph</text></g>
    <g class="line line-2"><text x="40" y="86" class="accent">&gt;</text><text x="60" y="86" class="muted">loading contribution data...</text></g>
    <g class="line line-3"><text x="40" y="108" class="accent">&gt;</text><text x="60" y="108" class="muted">rendering contribution history...</text></g>
    <g class="line line-4"><text x="40" y="130" class="accent">&gt;</text><text x="60" y="130" class="accent">status: ONLINE</text></g>
  </g>
  <text x="40" y="158" font-size="12" class="primary graph" letter-spacing="1.5">CONTRIBUTION ACTIVITY · @${esc(data.username)}</text>
  <g class="graph" transform="translate(90 178)" filter="url(#glow)">${cells}</g>
  <g class="graph muted" font-size="10"><text x="40" y="190">Mon</text><text x="40" y="214">Wed</text><text x="40" y="238">Fri</text></g>
  <g class="stats" font-size="13"><text x="40" y="318" class="accent">${esc(data.totalContributions)}</text><text x="110" y="318" class="primary">contributions in the last year</text><text x="40" y="342" class="muted">less</text><rect x="71" y="334" width="9" height="9" rx="2" class="level-0"/><rect x="86" y="334" width="9" height="9" rx="2" class="level-1"/><rect x="101" y="334" width="9" height="9" rx="2" class="level-2"/><rect x="116" y="334" width="9" height="9" rx="2" class="level-3"/><rect x="131" y="334" width="9" height="9" rx="2" class="level-4"/><text x="149" y="342" class="muted">more</text></g>
  <g class="stats" font-size="13"><text x="40" y="370" class="accent">devang@github:~$</text><rect class="cursor" x="185" y="363" width="9" height="14" fill="#E6EDF3"/></g>
  <rect width="800" height="390" rx="14" fill="url(#scanlines)" class="scanlines"/>
</svg>
`;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, svg);
console.log(`Generated ${outputPath}`);
