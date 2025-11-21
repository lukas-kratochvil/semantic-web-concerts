# Music-Event-Connect

## Initial setup

### Import data to Virtuoso
Firstly, adjust the values of the env variables `VIRT_Parameters_NumberOfBuffers` and `VIRT_Parameters_MaxDirtyBuffers` in the `docker-compose.yml`. Set `VIRT_Parameters_MaxDirtyBuffers` to a max of 50 % of total buffers (value `VIRT_Parameters_NumberOfBuffers`) and a max of 1 GB. Then restart the `virtuoso` service. After successful import, change these env vars back to one of the recommended settings listed in the `virtuoso.ini` and restart `virtuoso`.

There is [import.sh](./virtuoso/scripts/import.sh) script to load initial data which uses [import-helpers](./virtuoso/scripts/import-helpers/). **Please, change the parameters, graph names etc. as you need.**
The command below can be used to load Virtuoso with initial RDF data (MusicBrainz, OSM CZE, etc.).
You should specify RDF files to be loaded to Virtuoso in the [prepare-import](./virtuoso/scripts/import-helpers/prepare.sql) file.
```bash
docker exec -it <virtuoso_container> bash //import/scripts/import.sh
```

Virtuoso may display the warning shown below, but there is no need to worry. It simply means that Virtuoso attempted to preload data pages from disk into RAM, but the operation failed, and these pages will be loaded normally later.
```
*** read-ahead of a free or out of range page dp L=147624, database not necessarily corrupted.
```

To check if all the RDF files were successfully loaded SQL command below can be run in the **Virtuoso Conductor**:
```sql
SELECT ll_file, ll_graph,ll_state, ll_started, ll_done, ll_host, ll_work_time, ll_error
FROM DB.DBA.LOAD_LIST
```

You can check database integrity but it might be a long-running process:
```bash
docker exec -i <virtuoso_container> isql 1111 dba <DBA_PASSWORD> exec="DB.DBA.integrity();"
```
