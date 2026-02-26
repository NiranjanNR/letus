#!/bin/bash
# infra/init-postgis.sh
# Runs automatically when the Postgres container starts for the first time.
# Installs the PostGIS extension into our database.

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

echo "PostGIS and uuid-ossp extensions installed."
