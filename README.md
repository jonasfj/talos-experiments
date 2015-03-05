Talos Experimentation Setup
===========================
_This repository is a collection of docker images and scripts useful for
running experiments with Talos on the cloud._

Datazilla Server Image
----------------------
Image for loading custom data into Datazilla from S3 and running Datazilla
locally. This is very neat as it allows you to quickly reset a Datazilla
deployment and load new data. It's also a very quick and reliable way of getting
a working Datazilla environment.

When started the `datazilla-server` image executes the following steps:
  1. Configure and launch memcached and MySQL.
  2. Configure datazilla with `talos` and `pushlog` projects.
  3. Load data from `INPUT_SOURCES`, which is `;` delimited list of
     `<osversion>=s3://<bucket>/<prefix>/`, where every `datazilla.json` file
     the S3 prefix is to be submitted with the given `<osversion>`.
  4. Upload `pushlog` based on date-range in data in `INPUT_SOURCES`.

MySQL port: 3306 (datazilla:nosecret)
WebServer port: 9090

Talos Test Image
----------------
Image for running talos on a build of Firefox with a set of configuration
options:
  * `$BUILD_URL`, URL to build archive of firefox (**required**),
  * `$TESTS`, tests to run eg. `ts:tp5o` (**required**),
  * `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`,
    `RESULT_BUCKET`, `RESULT_PREFIX` credentials, region, bucket and prefix
    for uploading results.
  * `$DISPLAY_SERVER`, `xvfb` or `xorg` (defaults to `xorg`)
  * `$DEBUG`, run talos in debug mode (defaults to false),
  * `$TITLE`, title of the machine to write in results,
  * `$BRANCH_NAME`, branch name to write in results,
  * `$BROWSER_PATH`, path to browser in build archive
    (defaults to `firefox/firefox`).

When started the `talos-tester` image executes the following steps:
  1. Download and extract build from $BUILD_URL
  2. Run xvfb or xorg depending on $DISPLAY_SERVER variable
  3. Construct and run talos command
  4. Upload artifacts to s3://$RESULT_BUCKET/RESULT_PREFIX/



docker run -e BUILD_URL -e TESTS='tsvgx' tutum.co/jonasfj/talos-tester:0.0.1


docker run -ti --name "talos-test-2" -e INPUT_URL -e TESTS='tsvgx' tutum.co/jonasfj/talos-tester:0.0.1


docker cp talos-test-2:/home/worker/artifacts ./

https://s3-us-west-2.amazonaws.com/jonasfj-talos-test-results/short-input.csv

https://s3-us-west-2.amazonaws.com/jonasfj-talos-test-results/input.csv
