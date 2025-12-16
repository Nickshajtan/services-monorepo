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

const syncGithubRulesets = async ({ config, token }) => {
  const REPO = process.env.GITHUB_REPOSITORY;
  if (!REPO) {
    throw new Error('GITHUB_REPOSITORY not set');
  }

  const [owner, repo] = REPO.split('/');
  const collectRulesetsFromBranches = (config) => {
    const out = [];
    for (const b of config.github?.branches ?? []) {
      for (const rs of b.rulesets ?? []) out.push(rs);
    }
    return out;
  };
  const desired = collectRulesetsFromBranches(config);
  if (!desired?.length) {
    return;
  }

  const existing = await githubRequest({
    method: 'GET',
    token,
    endpoint: `/repos/${owner}/${repo}/rulesets?per_page=100`,
  });
  const map = new Map((existing || []).map((rs) => [rs.name, rs]));
  for (const rs of desired) {
    const current = map.get(rs.name);
    if (!current) {
      await githubRequest({
        method: 'POST',
        token,
        endpoint: `/repos/${owner}/${repo}/rulesets`,
        body: rs,
      });
    } else {
      await githubRequest({
        method: 'PUT',
        token,
        endpoint: `/repos/${owner}/${repo}/rulesets/${current.id}`,
        body: { ...rs, id: current.id },
      });
    }
  }
};

const githubSupportsRulesets = async ({ token }) => {
  const REPO = process.env.GITHUB_REPOSITORY;
  if (!REPO) {
    throw new Error('GITHUB_REPOSITORY not set');
  }

  try {
    const [owner, repo] = REPO.split('/');
    await githubRequest({
      method: 'GET',
      token,
      endpoint: `/repos/${owner}/${repo}/rulesets?per_page=1`,
    });
    return true;
  } catch (error) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
};

module.exports = {
  githubSupportsRulesets,
  githubRequest,
  syncGithubBranches,
  githubBranchExists,
  listAllBranches,
  syncGithubRulesets,
};
