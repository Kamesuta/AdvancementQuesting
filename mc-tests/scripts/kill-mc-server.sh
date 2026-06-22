#!/bin/sh
# Kill java processes whose CWD matches the given run directory
RUNDIR="${1%/}"  # strip trailing slash
killed=0
for pid in $(pgrep java 2>/dev/null); do
  cwd=$(readlink /proc/$pid/cwd 2>/dev/null)
  if [ "${cwd%/}" = "$RUNDIR" ]; then
    kill -9 "$pid"
    echo "Killed PID $pid (cwd: $cwd)"
    killed=$((killed + 1))
  fi
done
if [ "$killed" -eq 0 ]; then
  echo "No java process found in $RUNDIR" >&2
  exit 1
fi
exit 0
