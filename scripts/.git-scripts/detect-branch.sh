#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (c) 2025–present Mykyta Nosov


# Declarations
SCRIPT_DIR=$(dirname "$0")
source "$SCRIPT_DIR/../utils/colored-text.sh"

detect_branch() {
  local __outvar="$1"
  local branch=""

  # GitHub Actions
  if [ -n "$GITHUB_REF" ]; then
    case "$GITHUB_REF" in
      refs/pull/*)
        branch="$GITHUB_HEAD_REF"
        ;;
      *)
        # cut off the prefix refs/heads/
        branchE=$(echo "$GITHUB_REF" | sed 's|refs/heads/||')
        ;;
    esac

  # GitLab CI
  elif [ -n "$CI_COMMIT_REF_NAME" ]; then
    if [ -n "$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME" ]; then
      branch="$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME"
    else
      branch="$CI_COMMIT_REF_NAME"
    fi

  # locally
  else
    # first we try to get the name if HEAD is on the branch
    branch=$(git symbolic-ref --short HEAD 2>/dev/null || true)

    # if it doesn't work (detached HEAD) - take a short hash
    if [ -z "$branch" ]; then
      branch=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    fi
  fi

  printf -v "$__outvar" '%s' "$branch"
}

# If running as script directly
if [ "${0##*/}" = "detect-branch.sh" ]; then
  detect_branch BRANCH
  if command -v log_info >/dev/null 2>&1; then
    log_info "Detected branch: $BRANCH"
  else
    printf "Detected branch: %s\n" "$BRANCH"
  fi
fi
