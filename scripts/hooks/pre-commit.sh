#!/usr/bin/env sh

ROOT_DIR="$(git rev-parse --show-toplevel)"
SCRIPTS_DIR="$ROOT_DIR/scripts"

. "$SCRIPTS_DIR/.git-scripts/validate-branch.sh"
. "$SCRIPTS_DIR/.git-scripts/validate-commit.sh"
. "$SCRIPTS_DIR/.license/add-spdx-headers.sh"
