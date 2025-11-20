#!/bin/bash

ISQL_PORT=$1
PARALLEL_LOADERS=$2

for ((i=1; i<=PARALLEL_LOADERS; i++))
do
  isql "$ISQL_PORT" dba "$DBA_PASSWORD" exec="rdf_loader_run();" &
done

wait
