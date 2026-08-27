#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const username = process.env.GITHUB_USERNAME || "devangc006";
const token = process.env.GITHUB_TOKEN;

if (!token) {
  throw new Error("GITHUB_TOKEN is required.");
}

const query = `
  query($login: String!) {
    user(login: $login) {
      login
      followers { totalCount }
      following { totalCount }
      repositories(ownerAffiliations: OWNER, privacy: PUBLIC, first: 100) {
        totalCount
        nodes {
          name
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges { size node { name color } }
          }
        }
      }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount contributionLevel } }
        }
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
      }
    }
  }
`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "github-profile-status-generator",
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

const user = payload.data?.user;
if (!user) {
  throw new Error(`GitHub user "${username}" was not found.`);
}

const languageTotals = new Map();
for (const repository of user.repositories.nodes) {
  for (const edge of repository.languages.edges) {
    const current = languageTotals.get(edge.node.name) || {
      name: edge.node.name,
      color: edge.node.color || "#8b949e",
      bytes: 0,
    };
    current.bytes += edge.size;
    languageTotals.set(edge.node.name, current);
  }
}

const allLanguages = [...languageTotals.values()];
const totalLanguageBytes = allLanguages.reduce((sum, language) => sum + language.bytes, 0);
const languages = allLanguages.sort((a, b) => b.bytes - a.bytes).slice(0, 4);

const output = {
  username: user.login,
  repositories: user.repositories.totalCount,
  followers: user.followers.totalCount,
  following: user.following.totalCount,
  contributions: user.contributionsCollection.contributionCalendar.totalContributions,
  contributionTypes: {
    commits: user.contributionsCollection.totalCommitContributions,
    issues: user.contributionsCollection.totalIssueContributions,
    pullRequests: user.contributionsCollection.totalPullRequestContributions,
    reviews: user.contributionsCollection.totalPullRequestReviewContributions,
  },
  averages: {
    perDay: Math.round((user.contributionsCollection.contributionCalendar.totalContributions / 365) * 100) / 100,
    perWeek: Math.round((user.contributionsCollection.contributionCalendar.totalContributions / 52) * 100) / 100,
  },
  weeks: user.contributionsCollection.contributionCalendar.weeks.map((week) =>
    week.contributionDays.map(({ date, contributionCount, contributionLevel }) => ({
      date,
      count: contributionCount,
      level: contributionLevel,
    })),
  ),
  languages: languages.map(({ name, color, bytes }) => ({
    name,
    color,
    percentage: totalLanguageBytes ? Math.round((bytes / totalLanguageBytes) * 1000) / 10 : 0,
  })),
  generatedAt: new Date().toISOString(),
};

const outputPath = path.join(process.cwd(), "data", "profile-stats.json");
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Saved live profile stats for @${output.username} to ${outputPath}`);
