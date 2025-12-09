#!/usr/bin/env sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (c) 2025–present Mykyta Nosov

# SPDX header template
SPDX_LINE="SPDX-License-Identifier: AGPL-3.0-or-later"
COPYRIGHT_LINE="Copyright (c) 2025–present Mykyta Nosov"

# Declarations
ROOT_DIR="$(git rev-parse --show-toplevel)"
SCRIPTS_DIR="$ROOT_DIR/scripts"
. "$SCRIPTS_DIR/utils/colored-text.sh"
MODE="staged"

# check CLI param
if [ "$1" = "--all" ]; then
  MODE="all"
fi

# Collect files
if [ "$MODE" = "staged" ]; then
  FILES=$(git diff --cached --name-only --diff-filter=ACM)
else
  FILES=$(git ls-files)
fi

# If nothing to process — exit silently
[ -z "$FILES" ] && exit 0

log_info "Checking SPDX headers..."

get_comment_style() {
    case "$1" in
        # C-similar
        *.php|*.js|*.ts|*.tsx|*.jsx|*.java|*.c|*.cpp|*.h|*.cs|*.go|*.rs)
            echo "slash"   # // ...
            ;;
        # shell / python / other
        *.sh|*.bash|*.zsh|*.py|*.rb|*.pl|*.env|*.ini|*.cfg|*.toml|*.ps1)
            echo "hash"    # # ...
            ;;
        # CSS / SCSS / HTML / XML
        *.css|*.scss|*.sass|*.less|*.html|*.htm|*.xml|*.vue)
            echo "block"   # /* ... */
            ;;
        *)
            echo "skip"
            ;;
    esac
}

is_text_file() {
    # git diff --numstat returns "-" for binary files
    # if there is a line with change numbers – consider it text
    git diff --cached --numstat -- "$1" | grep -qE '^[0-9]+'
}

for file in $FILES; do
    [ ! -f "$file" ] && continue
    # skip binary
    if is_text_file "$file"; then
        continue
    fi

    style=$(get_comment_style "$file")
    if [ "skip" = "$style" ]; then
        # don't touch if don't know the format
        continue
    fi

    # If contains SPDX already
    if grep -q 'SPDX-License-Identifier' "$file"; then
        continue
    fi

    log_info "Adding SPDX header to $file..."
    TMP_FILE=$(mktemp 2>/dev/null || echo "./tmp_spdx_$$")

    case "$style" in
        slash)
        {
            printf "\n"
            printf "// %s" "$SPDX_LINE"
            printf "// %s" "$COPYRIGHT_LINE"
            printf "\n"
            cat "$file"
        } > "$TMP_FILE"
        ;;
        hash)
        {
            first_line=$(head -n 1 "$file")
            if printf "%s" "$first_line" | grep -q "^#!"; then
                printf "%s\n" "$first_line"
                printf "# %s\n" "$SPDX_LINE"
                printf "# %s\n\n" "$COPYRIGHT_LINE"
                tail -n +2 "$file"
            else
                printf "\n"
                printf "# %s" "$SPDX_LINE"
                printf "# %s" "$COPYRIGHT_LINE"
                printf "\n"
                cat "$file"
            fi
        } > "$TMP_FILE"
        ;;
        block)
        {
            printf "\n"
            printf "/* %s */\n" "$SPDX_LINE"
            printf "/* %s */\n" "$COPYRIGHT_LINE"
            printf "\n"
            cat "$file"
        } > "$TMP_FILE"
        ;;
    esac

    mv "$TMP_FILE" "$file"
    git add "$file"
done

log_ok "SPDX headers processed"
