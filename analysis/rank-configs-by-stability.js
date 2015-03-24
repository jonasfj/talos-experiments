import Promise      from 'promise';
import compute      from 'compute.io';
import assert       from 'assert';
import _            from 'lodash';
import recursive    from 'recursive-readdir';
import path         from 'path';
import fs           from 'fs';

var DISCARD_FIRST_ENTRY = true;

/** Add rankByCase to configurations as mapping from caseName to rank */
var computeRankByCase = (configurations) => {

  // Find caseNames, ensure they all have the same cases
  var caseNames = [];
  for (var conf of configurations) {
    caseNames = _.union(caseNames, _.keys(conf.cases));
  }

  // Exclude configurations that doesn't have all test cases
  configurations = configurations.filter(conf => {
    var missingTestCase = null;
    // See if conf is missing a caseName
    caseNames.forEach(caseName => {
      if (conf.cases[caseName] === undefined) {
        missingTestCase = caseName;
      }
    });
    if (missingTestCase) {
      console.log("Missing test case: %s, from configuration: %s",
                  missingTestCase, conf.name);
    }
    return !missingTestCase;
  });

  // For each test case across all suites, compute std. dev. for all
  // configurations and assign configurations based on how good their std. dev.
  // is, such that smallest std. dev. gets rank 0
  for (var caseName of caseNames) {
    var confsByWithStdDev = configurations.map(conf => {
      var results = conf.cases[caseName];
      if (DISCARD_FIRST_ENTRY) {
        results = results.slice();
        results.shift(); // Remove first entry
      }
      return {
        name:     conf.name,
        stddev:   compute.stdev(results)
      };
    }).sort((a, b) => { return a.stddev - b.stddev; });

    configurations.forEach(conf => {
      var rank = _.findIndex(confsByWithStdDev, c => {
        return c.name === conf.name;
      });
      assert(rank !== -1, "Rank can't be -1");
      conf.rankByCase = conf.rankByCase || {};
      conf.rankByCase[caseName] = rank;
    });
  }

  return configurations;
};

var computeRankByMean = (configurations) => {
  return configurations.map((conf) => {
    return {
      name:     conf.name,
      score:    compute.mean(_.values(conf.rankByCase))
    }
  }).sort((a, b) => {
    return a.score - b.score;
  });
};

var computeRankByMedian = (configurations) => {
  return configurations.map((conf) => {
    return {
      name:     conf.name,
      score:    compute.median(_.values(conf.rankByCase))
    }
  }).sort((a, b) => {
    return a.score - b.score;
  });
};

var computeRankByTrucMean = (configurations) => {
  return configurations.map((conf) => {
    return {
      name:     conf.name,
      score:    compute.truncmean(_.values(conf.rankByCase), 0.1)
    }
  }).sort((a, b) => {
    return a.score - b.score;
  });
};

var main = async (argv) => {
  var testNames = process.env.TESTS.split(':');

  var resultFolder = path.join(__dirname, '..', 'results');
  var files = await Promise.denodeify(recursive)(resultFolder);

  // Load all data files
  var dataFiles = files.filter(file => {
    return /talos\/datazilla\.json$/.test(file);
  }).map(file => {
    file = file.substr(resultFolder.length + 1);
    return {
      file: file.substr(0, file.length - "/talos/datazilla.json".length),
      data: JSON.parse(fs.readFileSync(path.join(resultFolder, file), {
        encoding: 'utf8'
      }))
    };
  });

  // Find configurations from dataFiles
  var configurations = dataFiles.map(({file, data}) => {
    // For each test under consideration (from TESTS environment variable)
    var tests = {}; // Mapping from: suiteName      -> result object
    var cases = {}; // Mapping from: suiteName+case -> array of results
    for (var suiteName of testNames) {
      tests[suiteName] = _.find(data, r => {
        return r.testrun.suite === suiteName;
      });
      assert(tests[suiteName], "Missing test: " + suiteName + " for " + file);
      // We call all entries in the test suite for cases, and name them as
      // suite + case, to build a dictionary of them:
      for (var caseName of _.keys(tests[suiteName].results)) {
        cases[suiteName + ':' + caseName] = tests[suiteName].results[caseName];
      }
    }
    return {
      name:     file,
      data, tests, cases
    };
  })

  // Compute rank for each case for all configurations
  configurations = computeRankByCase(configurations);

  // Utility to render results
  var renderConfigurationScore = (c) => {
    var name = c.name + ',';
    while(name.length < 50) {
      name += " ";
    }
    console.log("%s %s", name, (Math.round(c.score * 100) / 100).toFixed(2));
  };

  // Various ways to combine ranks from different testCase across all suites
  // using mean, median, trimmed mean

  console.log("\n### Rank Configurations with Score = Mean(rankByCase)");
  computeRankByMean(configurations).forEach(renderConfigurationScore);

  console.log("\n### Rank Configurations with Score = Median(rankByCase)");
  computeRankByMedian(configurations).forEach(renderConfigurationScore);

  console.log("\n### Rank Configurations with Score = TruncMean(rankByCase)");
  computeRankByTrucMean(configurations).forEach(renderConfigurationScore);
};


// Run main if this is the main function
if (!module.parent) {
  main(process.argv).catch(err => {
    console.log(err.stack);
  });
}
