-- Write data from RAM and transaction log information to disk
checkpoint;

-- Re-enable automatic checkpoints (every 60 mins)
checkpoint_interval(60);

-- Check for failures during load (should be empty)
SELECT * FROM DB.DBA.LOAD_LIST WHERE ll_error IS NOT NULL;

-- Show statistics for loaded data
SELECT
  ll_graph AS Graph_Name,
  MIN(ll_started) AS Start_Time,
  MAX(ll_done) AS Finish_Time,
  -- Sum seconds first, then convert to minutes for better precision
  ROUND(datediff('second', MIN(ll_started), MAX(ll_done)) / 60.0, 0) as Duration_Minutes,
  ROUND(sum(datediff('second', ll_started, ll_done)) / 60.0, 0) as Total_CPU_Minutes,
  COUNT(*) AS Files_Count
FROM DB.DBA.load_list
WHERE ll_graph IN (
    'http://music-event-connect.cz/musicbrainz',
    'http://music-event-connect.cz/osm/cze'
)
AND ll_state = 2  -- Only count finished files
GROUP BY ll_graph;
