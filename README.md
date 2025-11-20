# Music-Event-Connect

## Initial setup

### Import data to Virtuoso
The command below can be used to load Virtuoso with initial RDF data (MusicBrainz, OSM CZE, etc.).
```bash
docker exec -it <virtuoso_container> bash //import/scripts/import.sh
```

Virtuoso may display the warning shown below, but there is no need to worry. It simply means that Virtuoso attempted to preload data pages from disk into RAM, but the operation failed, and these pages will be loaded normally later.
```
*** read-ahead of a free or out of range page dp L=147624, database not necessarily corrupted.
```

To check if all the RDF files were successfully loaded SQL command below can be run in the [Virtuoso Conductor](http://localhost:8890/conductor/isql_main.vspx):
```sql
SELECT ll_file, ll_graph,ll_state, ll_started, ll_done, ll_host, ll_work_time, ll_error
FROM DB.DBA.LOAD_LIST
```
