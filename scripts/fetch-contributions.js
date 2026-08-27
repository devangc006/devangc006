#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const username = process.env.GITHUB_USERNAME || process.argv[2] || "devangc006";
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error("GITHUB_TOKEN is required. Create a token with public read access and try again.");
  process.exit(1);
}

const query = `
  query($login: String!) {
    user(login: $login) {
      login
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays { contributionCount date }
          }
        }
      }
    }
  }
`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "contribution-terminal-generator",
  },
  body: JSON.stringify({ query, variables: { login: username } }),
});

if (!response.ok) {
  throw new Error(`GitHub GraphQL returned HTTP ${response.status}: ${await response.text()}`);
}

const payload = await response.json();
if (payload.errors?.length) {
  throw new Error(payload.errors.map((error) => error.message).join("; "));
}
if (!payload.data?.user) {
  throw new Error(`GitHub user "${username}" was not found.`);
}

const calendar = payload.data.user.contributionsCollection.contributionCalendar;
const weeks = calendar.weeks.slice(-53).map((week) =>
  week.contributionDays.map(({ date, contributionCount }) => ({
    date,
    count: contributionCount,
  })),
);

while (weeks.length < 53) weeks.unshift([]);
for (const week of weeks) while (week.length < 7) week.push(null);

const output = {
  username: payload.data.user.login,
  totalContributions: calendar.totalContributions,
  generatedAt: new Date().toISOString(),
  weeks,
};

const outputPath = path.join(process.cwd(), "data", "contributions.json");
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Saved ${output.totalContributions} contributions for @${output.username} to ${outputPath}`);
