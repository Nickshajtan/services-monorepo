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

const gitlabBranchExists = async ({
  projectId,
  branch,
  token,
  baseUrl = 'https://gitlab.com/api/v4',
}) => {
  try {
    await gitlabRequest({
      method: 'GET',
      token,
      endpoint: `/projects/${encodeURIComponent(projectId)}/repository/branches/${encodeURIComponent(branch)}`,
      baseUrl,
    });
    return true;
  } catch (error) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
};

const listAllGitlabBranches = async ({
  projectId,
  token,
  baseUrl = 'https://gitlab.com/api/v4',
}) => {
  const names = new Set();
  let page = 1;

  while (true) {
    const branches = await gitlabRequest({
      method: 'GET',
      token,
      baseUrl,
      endpoint: `/projects/${encodeURIComponent(projectId)}/repository/branches?per_page=100&page=${page}`,
    });

    if (!Array.isArray(branches) || branches.length === 0) break;

    for (const b of branches) {
      names.add(b.name);
    }

    page++;
  }

  return names;
};

const getProtectedBranchesMap = async ({
  projectId,
  token,
  baseUrl = 'https://gitlab.com/api/v4',
}) => {
  const list = await gitlabRequest({
    method: 'GET',
    baseUrl,
    token,
    endpoint: `/projects/${encodeURIComponent(projectId)}/protected_branches?per_page=100`,
  });

  return new Map((list || []).map((b) => [b.name, b]));
};

const syncGitlabBranches = async ({ config, token }) => {
  const projectId = process.env.GITLAB_PROJECT_ID;
  const gitlabUrl = process.env.GITLAB_URL || 'https://gitlab.com';

  if (!projectId) {
    console.error(kleur.red('GITLAB_PROJECT_ID not set'));
    process.exit(1);
  }

  if (!config.gitlab?.branches) {
    console.log(kleur.yellow('No gitlab.branches config, skipping GitLab sync'));
    return;
  }

  const existingBranches = await listAllGitlabBranches({ projectId, gitlabUrl, token });
  const protectedMap = await getProtectedBranchesMap({ projectId, gitlabUrl, token });
  const base = `/projects/${encodeURIComponent(projectId)}/protected_branches`;

  for (const rule of config.gitlab.branches) {
    const name = rule.name;
    const settings = rule.settings || {};
    if (!existingBranches.has(name)) {
      console.log(kleur.yellow(`Branch "${name}" does not exist — skipping`));
      continue;
    }

    if (!protectedMap.has(name)) {
      console.log(kleur.blue(`Create GitLab protected branch ${name}`));
      await gitlabRequest({
        method: 'POST',
        gitlabUrl,
        token,
        endpoint: base,
        body: { name, ...settings },
      });
    } else {
      console.log(kleur.blue(`Update GitLab protected branch ${name}`));
      await gitlabRequest({
        method: 'PATCH',
        gitlabUrl,
        token,
        endpoint: `${base}/${encodeURIComponent(name)}`,
        body: settings,
      });
    }
  }
};

module.exports = {
  gitlabRequest,
  syncGitlabBranches,
  gitlabBranchExists,
  getProtectedBranchesMap,
  listAllGitlabBranches,
};
