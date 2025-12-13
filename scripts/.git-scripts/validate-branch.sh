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
  log_warn "Skipping validation for Dependabot branch..."
  exit 0
fi

log_info "Branch name to validation '$BRANCH_NAME'"
log_info "Branch validation started..."

case "$BRANCH_NAME" in
  init|main|staging|production|prelaunch|develop)
  log_warn "Skipping validation for '$BRANCH_NAME' branch..."
  exit 0 ;;
esac

case "$BRANCH_NAME" in
  init/*|feature/*|fix/*|hotfix/*) ;;
  *)
    log_err "Branch name must start with 'init/', 'feature/', 'fix/', or 'hotfix/'"
    exit 1
    ;;
esac

log_ok "Branch validation finished"
