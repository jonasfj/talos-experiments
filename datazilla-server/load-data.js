var request     = require('superagent-promise');
var slugid      = require('slugid');
var fs          = require('fs');
var _           = require('lodash');
var mkdirp      = require('mkdirp');
var path        = require('path');

var loadDataUrl = 'http://localhost:9090/talos/api/load_test/';

var recursive = require('recursive-readdir');
var osVersion   = process.argv[2];
var dataFolder  = process.argv[3];
var dateFile    = process.argv[4];
if (!osVersion || !dataFolder) {
  console.log("Usage: babel-node -r load-data.js OSVERSION DATA_FOLDER " +
              "DATE_FILE");
  process.exit(1);
}

var dates = {
  min:      99999999,
  max:      0
};
try {
  dates = JSON.parse(fs.readFileSync(dateFile));
}
catch (err) {
  console.log("Failed to load %s due to error: %s", dateFile, err.stack);
}

// Find all files and send stuff from them
recursive(dataFolder, async (err, files) => {
  var i = 0;
  for(let file of files) {
    i += 1;
    console.log("-------------------------------------------------------");
    console.log("Loading: " + file);
    console.log("%s of %s", i, files.length);
    let entries = JSON.parse(fs.readFileSync(file));
    try {
      await Promise.all(entries.map((entry) => {
        entry.test_machine.osversion = osVersion;
        var date = parseInt(entry.test_build.id.substr(0, 8));
        dates.min = Math.min(dates.min, date);
        dates.max = Math.max(dates.max, date);
        return request
          .post(loadDataUrl)
          .type('form')
          .send({
            data:                   JSON.stringify(entry),
            user:                   'talos',
            oauth_version:          '1.0',
            oauth_nonce:            slugid.v4(),
            oauth_timestamp:        Math.floor(Date.now() / 1000),
            oauth_token:            process.env.OAUTH_CONSUMER_KEY,
            oauth_consumer_key:     process.env.OAUTH_CONSUMER_KEY
          })
          .buffer()
          .end()
          .then((res) => {
            if (!res.ok) {
              throw new Error("Failed to insert: " + res.text);
            }
          });
      }));
      console.log("Posted from " + file);
    }
    catch(err) {
      console.log("Failed to post from: " + file);
      console.log("Error: %s", err.stack);
      console.log("");
    }
  }

  // Write out dates file
  fs.writeFileSync(dateFile, JSON.stringify(dates), {encoding: 'utf8'});
});

