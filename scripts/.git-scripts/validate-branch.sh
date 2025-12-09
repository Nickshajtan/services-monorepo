#!/usr/bin/env bash

# Declarations
ROOT_DIR="$(git rev-parse --show-toplevel)"
SCRIPTS_DIR="$ROOT_DIR/scripts"
source "$SCRIPTS_DIR/utils/colored-text.sh"
source "$SCRIPTS_DIR/.git-scripts/detect-branch.sh"
detect_branch BRANCH_NAME

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
