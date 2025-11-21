#!/bin/bash
# See: https://vos.openlinksw.com/owiki/wiki/VOS/VirtBulkRDFLoader

echo "--- IMPORT STARTED ---"

SCRIPT_DIR="/import/scripts"
HELPER_DIR="$SCRIPT_DIR/import-helpers"
ISQL_PORT=1111

echo "-------------------------------------"
echo "1. Preparing database..."
echo "-------------------------------------"
isql "$ISQL_PORT" dba "$DBA_PASSWORD" < "$HELPER_DIR/prepare.sql"

echo "-------------------------------------"
echo "2. Starting parallel load..."
echo "-------------------------------------"
# It is recommended a maximum of num_cores/2.5, to optimally parallelize the data load and hence maximize load speed.
# See section "Running multiple Loaders" in https://vos.openlinksw.com/owiki/wiki/VOS/VirtBulkRDFLoader.
PARALLEL_LOADERS=4
bash "$HELPER_DIR/run_parallel.sh" $ISQL_PORT $PARALLEL_LOADERS

echo "-------------------------------------"
echo "3. Finalizing..."
echo "-------------------------------------"
isql "$ISQL_PORT" dba "$DBA_PASSWORD" < "$HELPER_DIR/finalize.sql"

echo "--- IMPORT FINISHED ---"
