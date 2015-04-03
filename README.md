Talos Experimentation Setup
===========================
_This repository is a collection of docker images and scripts useful for
running experiments with Talos on the cloud._

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

Test Data
---------

tart/cart 40% regression:
fe5c25b8b675   http://ftp.mozilla.org/pub/mozilla.org/firefox/tinderbox-builds/mozilla-inbound-linux64/1423689944/firefox-38.0a1.en-US.linux-x86_64.tar.bz2

tart/cart normal:
c448634fb6c9   http://ftp.mozilla.org/pub/mozilla.org/firefox/tinderbox-builds/mozilla-inbound-linux64/1423688382/firefox-38.0a1.en-US.linux-x86_64.tar.bz2


TODO:
 + filter down to: suite > test (by click on table row)
 - generate data for: small-set on aws c4

azure vm create --verbose --json --location "West US" -z A1 talos-A1 'b39f27a8b8c64d52b05eac6a62ebad85__Ubuntu-14_04_2_LTS-amd64-server-20150309-en-us-30GB' --custom-data ./launch-script.sh

Standard_D1,
Standard_D2,
Standard_D3,
Standard_D4,
Small,
Medium,
Large,
ExtraLarge,

ExtraSmall,
A5,
A6,
A7,
A8,
A9,
A10,
A11,
Basic_A0,
Basic_A1,
Basic_A2,
Basic_A3,
Basic_A4,

Standard_D11,
Standard_D12,
Standard_D13,
Standard_D14,
Standard_G1,
Standard_G2,
Standard_G3,
Standard_G4,
Standard_G5

Missing: A1, D1, D2, D4
Started: A1, D1, D2, D4

azure vm create --verbose --json --location "West US" -z Small talos-A1 -e 22 'b39f27a8b8c64d52b05eac6a62ebad85__Ubuntu-14_04_2_LTS-amd64-server-20150309-en-us-30GB' --custom-data ./launch-script.sh --userName ubuntu --password '123s4_ABC=abc'

azure vm create --verbose --json --location "West US" -z Standard_D1 talos-D1 -e 22 'b39f27a8b8c64d52b05eac6a62ebad85__Ubuntu-14_04_2_LTS-amd64-server-20150309-en-us-30GB' --custom-data ./launch-script.sh --userName ubuntu --password '123s4_ABC=abc'
