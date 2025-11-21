#!/bin/bash

ISQL_PORT=$1
PARALLEL_LOADERS=$2

# Setup periodical checkpoint watchdog to avoid transaction log overflow
CHECKPOINT_INTERVAL_SEC=300  # 5 mins
(
  while true; do
    sleep $CHECKPOINT_INTERVAL_SEC
    echo "[Watchdog] Running intermediate checkpoint..."
    isql "$ISQL_PORT" dba "$DBA_PASSWORD" exec="checkpoint;"
  done
) &
WATCHDOG_PID=$!

# Start parallel RDF loaders
LOADER_PIDS=""
for ((i=1; i<=PARALLEL_LOADERS; i++))
do
  isql "$ISQL_PORT" dba "$DBA_PASSWORD" exec="rdf_loader_run();" &
  LOADER_PIDS="$LOADER_PIDS $!"
done

# Wait for all loaders to finish and then stop the checkpoint watchdog
wait $LOADER_PIDS
kill $WATCHDOG_PID 2>/dev/null
