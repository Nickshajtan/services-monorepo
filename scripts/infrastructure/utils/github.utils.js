// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2025–present Mykyta Nosov

const fetch = require('node-fetch').default;
const kleur = require('kleur');

const githubRequest = async ({ method, endpoint, body, token }) => {
  const url = `https://api.github.com${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'labels-sync-script',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      kleur.red(`${method} ${endpoint} failed: ${res.status} ${res.statusText}\n${text}`)
    );
  }

  return res.json();
};

const githubBranchExists = async ({ owner, repo, branch, token }) => {
  try {
    await githubRequest({
      method: 'GET',
      token,
      endpoint: `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
    });
    return true;
  } catch (error) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
};

const listAllBranches = async ({ owner, repo, token }) => {
  const names = new Set();
  let page = 1;

  while (true) {
    const branches = await githubRequest({
      method: 'GET',
      token,
      endpoint: `/repos/${owner}/${repo}/branches?per_page=100&page=${page}`,
    });

    if (!Array.isArray(branches) || branches.length === 0) break;

    for (const b of branches) names.add(b.name);
    page++;
  }

  return names;
};

const syncGithubBranches = async ({ config, token }) => {
  const REPO = process.env.GITHUB_REPOSITORY;
  if (!REPO) {
    console.error(kleur.red('GITHUB_REPOSITORY not set'));
    process.exit(1);
  }

  const [owner, repo] = REPO.split('/');
  if (!config.github || !config.github.branches) {
    console.log(kleur.yellow('No github.branches config, skipping GitHub sync'));
    return;
  }

  const existingBranches = await listAllBranches({ owner, repo, token });
  for (const rule of config.github.branches) {
    const branch = rule.name;
    if (!existingBranches.has(branch)) {
      console.log(kleur.yellow(`Branch "${branch}" does not exist — skipping`));
      continue;
    }

    const body = rule.protection || {};
    console.log(kleur.blue(`Sync GitHub branch protection for ${branch}`));

    await githubRequest({
      method: 'PUT',
      token: token,
      endpoint: `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}/protection`,
      body,
    });
  }
};

module.exports = { githubRequest, syncGithubBranches, githubBranchExists, listAllBranches };
