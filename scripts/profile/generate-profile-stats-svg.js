#!/usr/bin/env node

import fs from "node:fs/promises";

const inputPath = process.argv[2] || "data/profile-stats.json";
const outputPath = process.argv[3] || "assets/generated/gh-status.svg";
const data = JSON.parse(await fs.readFile(inputPath, "utf8"));
data.averages ||= {
  perDay: Math.round((data.contributions / 365) * 100) / 100,
  perWeek: Math.round((data.contributions / 52) * 100) / 100,
};
data.languages ||= [];
const esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
}[character]));
const weeks = (data.weeks || []).slice(-53);
while (weeks.length < 53) weeks.unshift([]);
for (const week of weeks) while (week.length < 7) week.push(null);
const levelMap = { NONE: 0, FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4 };
const cells = weeks.map((week, column) => week.map((day, row) => {
  const count = day?.count || 0;
  const level = levelMap[day?.level] ?? (count ? 1 : 0);
  return `<rect x="${column * 11}" y="${row * 11}" width="8" height="8" rx="2" class="level-${level}"><title>${esc(day?.date || "No date")}: ${count} contributions</title></rect>`;
}).join("")).join("");

const stats = [
  ["repos", data.repositories],
  ["followers", data.followers],
  ["following", data.following],
  ["contribs", data.contributions],
  ["avg/day", data.averages.perDay],
  ["avg/week", data.averages.perWeek],
];
const statLines = stats.map(([label, value], index) =>
  `<g class="line" style="animation-delay:${(index * 0.12).toFixed(2)}s"><text x="60" y="${108 + index * 23}" class="muted">[</text><text x="68" y="${108 + index * 23}" class="accent">→</text><text x="82" y="${108 + index * 23}" class="muted">]</text><text x="120" y="${108 + index * 23}" class="muted">${label}</text><text x="240" y="${108 + index * 23}" class="primary">${esc(value)}</text></g>`,
).join("");
const languageLines = data.languages.map((language, index) => {
  const bar = "▮".repeat(Math.max(1, Math.round(language.percentage / 10))) +
    "░".repeat(Math.max(0, 10 - Math.round(language.percentage / 10)));
  const y = 398 + index * 22;
  return `<g class="line" style="animation-delay:${(0.8 + index * 0.12).toFixed(2)}s"><text x="60" y="${y}" fill="${esc(language.color)}">${bar}</text><text x="220" y="${y}" class="primary">${esc(language.name)}</text><text x="390" y="${y}" class="muted">${esc(language.percentage)}%</text></g>`;
}).join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="510" viewBox="0 0 800 510" role="img" aria-labelledby="title desc">
  <title id="title">Live GitHub profile status for @${esc(data.username)}</title>
  <desc id="desc">${esc(data.repositories)} public repositories, ${esc(data.followers)} followers, ${esc(data.contributions)} contributions in the last year, and most-used languages.</desc>
  <style>
    text { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 13px; dominant-baseline: middle; }
    .terminal { fill:#0a0a0b; } .primary { fill:#E6EDF3; } .muted { fill:#6E7681; } .accent { fill:#00FF9C; }
    .cell { fill:#161B22; } .level-1 { fill:#064E3B; } .level-2 { fill:#059669; } .level-3 { fill:#00D084; } .level-4 { fill:#00FF9C; }
    .line { opacity:1; animation: reveal 12s ease-in-out infinite; }
    .cursor { animation: blink 1s steps(1,end) infinite; }
    @keyframes reveal { 0%,4% { opacity:.35; transform:translateY(4px) } 10%,88% { opacity:1; transform:translateY(0) } 94%,100% { opacity:.35; transform:translateY(4px) } }
    @keyframes blink { 0%,49% { opacity:1 } 50%,100% { opacity:0 } }
    @media (prefers-reduced-motion: reduce) { .line { animation:none; opacity:1; } .cursor { animation:none; } }
  </style>
  <rect width="800" height="510" rx="14" class="terminal"/>
  <g opacity=".5"><circle cx="24" cy="24" r="6" fill="#ff5f57"/><circle cx="44" cy="24" r="6" fill="#febc2e"/><circle cx="64" cy="24" r="6" fill="#28c840"/></g>
  <text x="400" y="28" text-anchor="middle" class="muted">~ / github-status.sh</text>
  <g class="line"><text x="40" y="64" class="accent">$</text><text x="60" y="64" class="primary">gh status --user ${esc(data.username)}</text></g>
  ${statLines}
  <g class="line" style="animation-delay:.5s"><text x="40" y="260" class="muted"># contribution activity · last year</text><g transform="translate(40 278)">${cells}</g></g>
  <g class="line" style="animation-delay:.7s"><text x="40" y="370" class="muted"># top languages</text></g>
  ${languageLines}
  <g class="line" style="animation-delay:1.3s"><text x="40" y="496" class="accent">$</text><text x="60" y="496" class="primary">ready</text><rect class="cursor" x="118" y="489" width="9" height="14" fill="#E6EDF3"/></g>
</svg>
`;

await fs.mkdir(new URL(".", `file://${process.cwd()}/${outputPath}`).pathname, { recursive: true });
await fs.writeFile(outputPath, svg);
console.log(`Generated ${outputPath}`);
