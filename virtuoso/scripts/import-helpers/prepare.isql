-- Disable the automatic checkpoint scheduler (default=60) - prevents Virtuoso from pausing the load every 60 mins to write to disk.
checkpoint_interval(0);

-- Register the files to be loaded
ld_dir('/import/data/musicbrainz', '*.ttl', 'http://music-event-connect.cz/musicbrainz');
ld_dir('/import/data/osm/parts', '*.ttl.gz', 'http://music-event-connect.cz/osm/cze');
