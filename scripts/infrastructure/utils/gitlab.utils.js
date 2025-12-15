const fetch = require('node-fetch').default;
const kleur = require('kleur');

const gitlabRequest = async ({ method, endpoint, body, gitlabUrl, token }) => {
  const url = `${gitlabUrl}/api/v4${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json',
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

const syncGitlabBranches = async ({ config, token }) => {
  const GITLAB_PROJECT_ID = process.env.GITLAB_PROJECT_ID;
  const GITLAB_URL = process.env.GITLAB_URL || 'https://gitlab.com';
  if (!GITLAB_PROJECT_ID) {
    console.error(kleur.red('GITLAB_PROJECT_ID not set'));
    process.exit(1);
  }

  if (!config.gitlab || !config.gitlab.branches) {
    console.log(kleur.yellow('No gitlab.branches config, skipping GitLab sync'));
    return;
  }

  const baseEndpoint = `/projects/${encodeURIComponent(GITLAB_PROJECT_ID)}/protected_branches`;
  const existing = await gitlabRequest({
    method: 'GET',
    gitlabUrl: GITLAB_URL,
    token: token,
    endpoint: baseEndpoint,
  });
  const map = new Map(existing.map((branch) => [branch.name, branch]));
  for (const rule of config.gitlab.branches) {
    const name = rule.name;
    const settings = rule.settings || {};
    const current = map.get(name);

    if (!current) {
      console.log(kleur.blue(`Create GitLab protected branch ${name}`));
      await gitlabRequest({
        method: 'POST',
        gitlabUrl: GITLAB_URL,
        token: token,
        endpoint: baseEndpoint,
        body: { name, ...settings },
      });
    } else {
      console.log(kleur.blue(`Update GitLab protected branch ${name}`));
      await gitlabRequest({
        method: 'PATCH',
        gitlabUrl: GITLAB_URL,
        token: token,
        endpoint: `${baseEndpoint}/${encodeURIComponent(name)}`,
        body: settings,
      });
    }
  }
};

module.exports = { gitlabRequest, syncGitlabBranches };
