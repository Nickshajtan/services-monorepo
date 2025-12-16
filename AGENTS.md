# AGENTS.md

This repository may be modified by automated or AI-assisted agents.

## General rules

- Do not change public APIs without explicit instruction
- Do not remove backward compatibility
- Prefer additive changes over refactors
- Follow existing architectural patterns

## Architecture

- Infrastructure scripts live in `scripts/infrastructure`
- GitHub/GitLab policies are managed as code
- Avoid introducing new tooling unless justified

## Code style

- JavaScript: Node.js 20+, ESM preferred unless stated otherwise
- Shell scripts: POSIX sh unless bash is explicitly used
- No new dependencies without approval

## CI / Policies

- Do not weaken branch protection, CI checks, or security policies
- Any change to `.github/` requires justification

## Allowed actions

- Update generated files when source changes
- Modify configuration files only via documented generators

## Forbidden actions

- Disabling CI or branch protection
- Force-pushing or rewriting history
