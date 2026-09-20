#!/usr/bin/env bash
# PostToolUse hook: lint (and auto-fix) a file just edited by the agent.
# Advisory only — always exits 0. `pnpm lint` and the Lint workflow are the blocking gates.
set -u
INPUT="$(cat)"
FILE="$(printf '%s' "$INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch{}})')"
[ -z "$FILE" ] && exit 0

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$FILE" in
  "$ROOT"/*) REL="${FILE#"$ROOT"/}" ;;
  *) REL="$FILE" ;;
esac

case "$REL" in
  tests/*.ts|tests/*.js|api/*.ts|api/*.js|fixtures/*.ts|fixtures/*.js|utils/*.ts|utils/*.js) ;;
  *) exit 0 ;;
esac

cd "$ROOT" || exit 0
if [ -x node_modules/.bin/eslint ]; then
  node_modules/.bin/eslint --fix "$REL" 2>&1 | sed 's/^/[lint] /'
  echo "[lint] eslint --fix finished for $REL (exit ${PIPESTATUS[0]})"
else
  echo "[lint] eslint not installed; run the package manager install first"
fi
exit 0
