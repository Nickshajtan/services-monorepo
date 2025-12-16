// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2025–present Mykyta Nosov

const fs = require('fs');
const path = require('path');
const kleur = require('kleur');
const YAML = require('yaml');

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
    console.error(kleur.red('TOKEN not set'));
    process.exit(1);
}

const loadConfig = (configPath) => {
    if (!fs.existsSync(configPath)) {
        throw new Error('Config file does not exist');
    }

    const extension = configPath.split('.').pop();
    if (!['json', 'yml', 'yaml'].includes(extension)) {
        throw new Error(`Config file extension ${extension} does not supported`);
    }

    const raw = fs.readFileSync(configPath, 'utf8');
    return 'json' === extension ? JSON.parse(raw) : YAML.parse(raw);
};
const main = async (configFile) => {
    const config = loadConfig(configFile);
    const isGithub = process.env.GITHUB_ACTIONS === 'true';
    const isGitlab = process.env.GITLAB_CI === 'true';

    if (!isGithub && !isGitlab) {
        console.log(kleur.yellow('Not running in GitHub Actions or GitLab CI, nothing to do'));
        process.exit(0);
    }

    if (isGithub) {
        const {
            githubSupportsRulesets,
            syncGithubBranches,
            syncGithubRulesets,
        } = require('./utils/github.utils');
        if (await githubSupportsRulesets({ token: TOKEN })) {
            await syncGithubRulesets({ config, token: TOKEN });
        } else {
            await syncGithubBranches({ config, token: TOKEN });
        }
    }

    if (isGitlab) {
        const { syncGitlabBranches } = require('./utils/gitlab.utils');
        await syncGitlabBranches({ config, token: TOKEN });
    }

    console.log(kleur.green('Branch protection synced.'));
    process.exit(0);
};

main(path.join(process.cwd(), '.github', 'branch-protection.yml')).catch((err) => {
    console.error(kleur.red(err));
    process.exit(1);
});
