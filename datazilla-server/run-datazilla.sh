#!/bin/bash -ve

# Launch memcached
MEMCACHED_PORT=11211;
/usr/bin/memcached -v -m 256 -p "$MEMCACHED_PORT" -u nobody &

# Setup MySQL
export DB_NAME="datazilla";
#export DB_USER="datazilla";
#export DB_PASS="nosecret";
export DB_REMOTE_ROOT_HOST="localhost";
export DB_REMOTE_ROOT_NAME="datazilla";
export DB_REMOTE_ROOT_PASS="nosecret";
./run-mysql.sh;

cd datazilla;

# Datazilla database setttings
export DATAZILLA_DATABASE_NAME="datazilla";
export DATAZILLA_DATABASE_USER="$DB_USER"
export DATAZILLA_DATABASE_PASSWORD="$DB_PASS";
export DATAZILLA_DATABASE_HOST='localhost';
export DATAZILLA_DATABASE_PORT=3306;
export DATAZILLA_RO_DATABASE_USER="$DATAZILLA_DATABASE_USER";
export DATAZILLA_RO_DATABASE_PASSWORD="$DATAZILLA_DATABASE_PASSWORD";

# Datazilla memcached setttings
export DATAZILLA_MEMCACHED="localhost:$MEMCACHED_PORT";

# Datazilla settings
export ALLOWED_PROJECTS="";    # Pipe delimited list of allowed projects
export DATAZILLA_URL="/";
export DATAZILLA_DEBUG="TRUE";
export DATAZILLA_DJANGO_SECRET_KEY="Not so secret after all";

# Setup database tables
python manage.py syncdb;
python manage.py create_perftest_project -p talos
python manage.py runserver 0.0.0.0:9090

#python manage.py testserver --addrport 0.0.0.0:9090

# Remember to modify datazilla/webapp/apps/datazilla/management/commands/post_json.py
# to have HTTP instead of HTTPS
# python manage.py post_json --project talos --file datazilla/model/sql/template_schema/schema_perftest.json  --host localhost:9090

