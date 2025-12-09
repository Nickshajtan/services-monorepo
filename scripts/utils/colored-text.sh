#!/usr/bin/env sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (c) 2025–present Mykyta Nosov


# ANSI
COLOR_RESET='\033[0m'
COLOR_GREEN='\033[32m'
COLOR_YELLOW='\033[33m'
COLOR_RED='\033[31m'
COLOR_BLUE='\033[34m'

cecho() {
  color="$1"
  shift
  printf "%b%s%b\n" "$color" "$*" "$COLOR_RESET"
}

log_info() {
  cecho "$COLOR_BLUE" "$@"
}

log_ok() {
  cecho "$COLOR_GREEN" "$@"
}

log_warn() {
  cecho "$COLOR_YELLOW" "$@"
}

log_err() {
  cecho "$COLOR_RED" "$@"
}
