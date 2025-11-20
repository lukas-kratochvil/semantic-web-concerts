#!/bin/bash

echo "--- OSM SPLITTING STARTED ---"

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
DEST_DIR="$SCRIPT_DIR/../rdf-data/osm"
CZE_OSM_BZ2_FILE="$SCRIPT_DIR/../rdf-data/osm/cze.osm.ttl.bz2"

# cze.osm.ttl is in Turtle format and @prefix statements are in the first 25 lines
# Also silence stderr (2> /dev/null) because bzcat will complain when head closes the pipe.
echo "1. Extracting prefixes..."
PREFIX_FILE="$DEST_DIR/prefixes.ttl"
bzcat "$CZE_OSM_BZ2_FILE" 2> /dev/null | awk '/^@prefix / {print; next} {exit}' > "$PREFIX_FILE"

NUM_PREFIX_LINES=$(wc -l < "$PREFIX_FILE")
echo "Found $NUM_PREFIX_LINES prefix lines."

# Split the file into parts, each of which will have prefixes at the top, and compress these parts using gzip.
echo "2. Splitting the file..."
PARTS_DIR="$DEST_DIR/parts"
mkdir -p "$PARTS_DIR"

START_LINE=$((NUM_PREFIX_LINES + 1))
TRIPLES_PER_FILE=20000000

bzcat "$CZE_OSM_BZ2_FILE" | \
  tail -n +$START_LINE | \
  split -d \
  --suffix-length=3 \
  -l $TRIPLES_PER_FILE \
  --filter="cat \"$PREFIX_FILE\" - | gzip > \"$PARTS_DIR/\$FILE.ttl.gz\"" \
  - cze.osm-

# Remove the temporary prefix file.
echo "3. Cleaning up..."
rm -rf "$PREFIX_FILE"

echo "--- OSM SPLITTING FINISHED ---"
