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

  for (const rule of config.github.branches) {
    const branch = rule.name;
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

module.exports = { githubRequest, syncGithubBranches };
