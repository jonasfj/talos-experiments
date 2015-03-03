#!/bin/bash -ve

# Entry point for talos-tester, does following:
# 1) Download and extract build from $BUILD_URL
# 2) Run xvfb or xorg depending on $DISPLAY_SERVER variable
# 3) Construct and run talos command
# 4) Upload artifacts to s3://$RESULT_BUCKET/RESULT_PREFIX/

ARTIFACTS=/home/worker/artifacts;
BROWSER_PATH="./build/${BROWSER_PATH:-firefox/firefox}";

# Ensure folders
mkdir -p ./build/;
mkdir -p "$ARTIFACTS/logs/talos";
mkdir -p "$ARTIFACTS/talos";

# Ensure upload configuration
echo "Test definition of RESULT_BUCKET and RESULT_PREFIX";
test "$RESULT_BUCKET";
test "$RESULT_PREFIX";

#### Step 1: Download and extract
echo 'Test that we have $BUILD_URL';
test "$BUILD_URL";
echo "Downloading $BUILD_URL";
curl -s --retry 10 -o ./build-archive "$BUILD_URL";
echo "Extracting...";
tar -xf ./build-archive -C ./build/;
echo "Test existence of $BROWSER_PATH";
test -x "$BROWSER_PATH";


#### Step 2: Start a $DISPLAY_SERVER
DISPLAY_PID="";
if [ "$DISPLAY_SERVER" == "xvfb" ]; then
  echo "Starting Xvfb";
  Xvfb                                                                      \
    "$DISPLAY"                                                              \
    -nolisten tcp                                                           \
    -screen 0 1600x1200x24                                                  \
    2> "$ARTIFACTS/logs/xvfb.log"                                           &
  DISPLAY_PID="$!";
else
  DISPLAY_SERVER='xorg';
  echo "Starting Xorg";
  Xorg                                                                      \
    -noreset                                                                \
    +extension GLX                                                          \
    +extension RANDR                                                        \
    +extension RENDER                                                       \
    -logfile "$ARTIFACTS/logs/xorg.log"                                     \
    -config ./resources/xorg.conf                                           \
    "$DISPLAY"                                                              \
    > /dev/null 2> /dev/null                                                &
  DISPLAY_PID="$!";
fi;
# Give the choice of display server some time to get ready
sleep 4;


#### Step 3: Run talos tests
echo 'Check that $TESTS is defined';
test "$TESTS";

# Construct command
CMD="talos --executablePath '$BROWSER_PATH' --activeTests '$TESTS' --develop";
if [ "$DEBUG" != "" ]; then
  CMD="$CMD --debug";
fi;

# Store result file and datazilla file in defaults, then removing the
# --develop flag doesn't change their locations
RESULT_FILE=./local.out;
DATAZILLA_FILE=./local.json;

# Add result output paths
CMD="$CMD --output '$ARTIFACTS/talos/configuration.json'";
CMD="$CMD --results_url 'file://$RESULT_FILE'";
CMD="$CMD --datazilla-url 'file://$DATAZILLA_FILE'";

# Add log output paths
CMD="$CMD --logFile '$ARTIFACTS/logs/talos/browser.log'";
CMD="$CMD --errorFile '$ARTIFACTS/logs/talos/errors.log'";

# Add title and branch name
CMD="$CMD --title '$TITLE'";
CMD="$CMD --branchName '$BRANCH_NAME'";

# Adding any additional arguments
CMD="$CMD $@";

# Run talos command
echo "Running talos:";
eval "$CMD";

# Copy artifacts to folder
if [ -f "$RESULT_FILE" ]; then
  cp "$RESULT_FILE" "$ARTIFACTS/talos/graphresults.out";
fi;
if [ -f "$DATAZILLA_FILE" ]; then
  cp "$DATAZILLA_FILE" "$ARTIFACTS/talos/datazilla.json";
fi;

# Kill display server
kill "$DISPLAY_PID";

### Step 4: Upload artifacts to S3
echo "Uploading Artifacts"
aws s3 sync "$ARTIFACTS" "s3://$RESULT_BUCKET/$RESULT_PREFIX/";
