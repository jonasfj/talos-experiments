#!/bin/bash -ve

# Launch memcached
MEMCACHED_PORT=11211;
/usr/bin/memcached -v -m 256 -p "$MEMCACHED_PORT" -u nobody &

cd /root;

# Setup MySQL
export DB_NAME="datazilla";
#export DB_USER="datazilla";
#export DB_PASS="nosecret";
export DB_REMOTE_ROOT_HOST="localhost";
export DB_REMOTE_ROOT_NAME="datazilla";
export DB_REMOTE_ROOT_PASS="nosecret";
./run-mysql.sh;

cd /root/datazilla;

# Construct config file
cp 'datazilla/settings/local.sample.py' 'datazilla/settings/local.py';
echo "OAUTH_CONSUMER_KEY=os.environ.get('OAUTH_CONSUMER_KEY')" >> \
     'datazilla/settings/local.py';
echo "OAUTH_CONSUMER_SECRET=os.environ.get('OAUTH_CONSUMER_SECRET')" >> \
     'datazilla/settings/local.py';

# Datazilla database setttings
export DATAZILLA_DATABASE_NAME="datazilla";
export DATAZILLA_DATABASE_USER="datazilla"
export DATAZILLA_DATABASE_PASSWORD="nosecret";
export DATAZILLA_DATABASE_HOST='localhost';
export DATAZILLA_DATABASE_PORT=3306;
export DATAZILLA_RO_DATABASE_USER="datazilla";
export DATAZILLA_RO_DATABASE_PASSWORD="nosecret";

# Datazilla memcached setttings
export DATAZILLA_MEMCACHED="localhost:$MEMCACHED_PORT";

# Datazilla settings
export ALLOWED_PROJECTS="";   # Pipe delimited list of projects, empty for all
export DATAZILLA_URL="/";
export DATAZILLA_DEBUG="TRUE";
export DATAZILLA_DJANGO_SECRET_KEY="nosecret";

# Setup database tables and project
python manage.py syncdb;
python manage.py create_perftest_project -p talos;
python manage.py create_pushlog --host localhost

# Run server
python manage.py runserver 0.0.0.0:9090 > /dev/null &

# Steal the oauth keys from the database
SQL='SELECT oauth_consumer_key, \
            oauth_consumer_secret \
     FROM datasource \
     WHERE name="talos_objectstore_1"';
KEYS=`mysql -u root datazilla -e "$SQL" | tail -n1`;

export OAUTH_CONSUMER_KEY=`echo "$KEYS" | cut -f1`;
export OAUTH_CONSUMER_SECRET=`echo "$KEYS" | cut -f2`;

echo "Credentials for 'talos' project:";
echo -e "\
OAUTH_CONSUMER_KEY    = '$OAUTH_CONSUMER_KEY'\n\
OAUTH_CONSUMER_SECRET = '$OAUTH_CONSUMER_SECRET'\n\
";

# Download data and load it into datazilla
DATA='/root/data/';
DATE_FILE='/root/date-file.json';
while IFS='=' read -r -d ';' OSVERSION S3_INPUT; do
  echo "Download $S3_INPUT as $OSVERSION";
  rm -rf $DATA;
  mkdir -p $DATA;
  aws s3 sync "$S3_INPUT" "$DATA" --exclude '*' --include '*/datazilla.json';
  echo "Loading $S3_INPUT as $OSVERSION";
  time /root/node_modules/.bin/babel-node -r /root/load-data.js \
    "$OSVERSION" "$DATA" "$DATE_FILE";
done <<< "$INPUT_SOURCES;";

echo "Max Date: `cat $DATE_FILE | jq .max`"
echo "Min Date: `cat $DATE_FILE | jq .min`";

/root/node_modules/.bin/babel-node -r /root/date-extends.js "$DATE_FILE";

#python manage.py update_pushlog --numdays=90 --repo_host hg.mozilla.org --branch "Mozilla-Inbound"
python manage.py process_objects -p talos --loadlimit 1000000 > /dev/null
python manage.py build_nav

exec bash --login;