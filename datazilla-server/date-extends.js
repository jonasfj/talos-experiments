var request     = require('superagent-promise');
var slugid      = require('slugid');
var fs          = require('fs');
var _           = require('lodash');

var dateFile    = process.argv[2];
if (!dateFile) {
  console.log("Usage: babel-node -r date-extends.js DATE_FILE");
  process.exit(1);
}

var dates = JSON.parse(fs.readFileSync(dateFile));


var min = dates.min + "";
var max = dates.max + "";
var minDate = new Date(+min.substr(0,4), +min.substr(4,2), +min.substr(6,2));
var maxDate = new Date(+max.substr(0,4), +max.substr(4,2), +max.substr(6,2));

var numDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
var numDays = Math.max(Math.floor(numDays), 0);
var endDate = max.substr(0,4) + '/' + max.substr(4,2) + '/' + max.substr(6,2);

// Always add day for good measure
console.log((numDays + 1) + " " + endDate);
// month day year