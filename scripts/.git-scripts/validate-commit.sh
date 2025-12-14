#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (c) 2025–present Mykyta Nosov


# Declarations
ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SCRIPTS_DIR="$ROOT_DIR/scripts"
source "$SCRIPTS_DIR/utils/colored-text.sh"
source "$SCRIPTS_DIR/.git-scripts/detect-branch.sh"

if [ -z "$BRANCH_NAME" ]; then
  detect_branch BRANCH_NAME
fi

# Skip bots safely — only if variable exists AND equals dependabot[bot]
if [ -n "${GITHUB_ACTOR:-}" ] && [ "$GITHUB_ACTOR" = "dependabot[bot]" ]; then
  log_warn "Skipping validation for Dependabot commit..."
  exit 0
fi

COMMIT_ARG="$1"
if [ -z "$COMMIT_ARG" ]; then
  log_err "No commit message or file path provided"
  exit 1
fi

COMMIT_MSG=""
log_info "Commit validation started..."

case "$BRANCH_NAME" in
  init|main|staging|production|prelaunch|develop)
  log_warn "Skipping validation for '$BRANCH_NAME' branch..."
  exit 0 ;;
esac

if [ -f "$COMMIT_ARG" ]; then
  # commit-msg hook: $1 = path to the commit message file
  COMMIT_MSG="$(head -n 1 "$COMMIT_ARG")"
else
  # CI: $1 = commit message text
  COMMIT_MSG="$COMMIT_ARG"
fi

commit_msg_lower=$(printf '%s' "$COMMIT_MSG" | tr '[:upper:]' '[:lower:]')

# Running in GitHub Actions, so skip if merging
case "$commit_msg_lower" in
  merge*|rebase*) exit 0 ;;
esac

# Running locally
case "$commit_msg_lower" in
  feat:*|fix:*|hotfix:*|chore:*|test:*|docs:*|refactor:*) ;;
  *)
    log_err "Commit message must start with 'feat:', 'fix:', 'chore:', 'refactor:', 'test:', 'docs:' or 'hotfix:'"
    exit 1
    ;;
esac

log_ok "Commit validation finished"
