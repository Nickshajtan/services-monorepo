#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (c) 2025–present Mykyta Nosov


# Declarations
ROOT_DIR="$(git rev-parse --show-toplevel)"
SCRIPTS_DIR="$ROOT_DIR/scripts"
source "$SCRIPTS_DIR/utils/colored-text.sh"
source "$SCRIPTS_DIR/.git-scripts/detect-branch.sh"
detect_branch BRANCH_NAME

log_info "Commit validation started..."

case "$BRANCH_NAME" in
  init|main|staging|production|prelaunch|develop)
  log_warn "Skipping validation for '$BRANCH_NAME' branch..."
  exit 0 ;;
esac

COMMIT_MSG_FILE="$1"
if [ ! -f "$COMMIT_MSG_FILE" ]; then
  log_err "Cannot read commit message file"
  exit 1
fi

COMMIT_MSG="$(head -n 1 "$COMMIT_MSG_FILE")"
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
