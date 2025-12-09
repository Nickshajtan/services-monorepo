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

commit_msg_lower=$(echo "$1" | tr '[:upper:]' '[:lower:]')

# Running in GitHub Actions, so skip if merging
case "$commit_msg_lower" in
  merge:*|rebase:*) exit 0 ;;
esac

# Running locally
case "$commit_msg_lower" in
  feat:*|fix:*|hotfix:*|test:*) ;;
  *)
    log_err "Commit message must start with 'feat:', 'fix:', 'test:', or 'hotfix:'"
    exit 1
    ;;
esac

log_ok "Commit validation finished"
