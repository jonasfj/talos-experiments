import Promise      from 'promise';
import compute      from 'compute.io';
import assert       from 'assert';
import _            from 'lodash';
import recursive    from 'recursive-readdir';
import path         from 'path';
import fs           from 'fs';
import ttest        from 'ttest';

var DISCARD_FIRST_ENTRY = true;

/**
 * Experiment where we return probability of regressions using students t-test
 * There is a fairly high risk that this is complete garbage, but it's here so
 * we can play with it.
 */
var printPropabilityOfRegression = (name, testsAndCasesA, testsAndCasesB) => {
  // Find all testcases
  var allTestCases = _.union(
    _.keys(testsAndCasesA.cases),
    _.keys(testsAndCasesB.cases)
  );

  console.log("###" + name);
  var alerts = 0;
  allTestCases.forEach((testCase) => {
    var p = ttest(
      testsAndCasesA.cases[testCase],
      testsAndCasesB.cases[testCase]
    ).pValue();
    var name = testCase + ',';
    while(name.length < 60) {
      name += " ";
    }
    var alert = "";
    // If probability that samples are from the same population is <= 0.05
    // we say that it's statistical significant and raise an alert
    if (p <= 0.01) {
      alert += "  !!!";
      alerts += 1;
    }
    console.log("%s %s", name, (Math.round(p * 100) / 100).toFixed(2) + alert);
  });
  console.log("Alerts: %s", alerts);
};

// Compute geometric mean of medians for each value in resultset
var computeGeoMeanOfMedians = (resultset) => {
  return compute.gmean(_.values(resultset).map(results => {
    results = results.slice();
    results.shift(); // Skip first result
    return compute.median(results);
  }));
};

var main = async (argv) => {
  var testNames = process.env.TESTS.split(':');

  var resultFolder = path.join(__dirname, '..', 'results');
  var files = await Promise.denodeify(recursive)(resultFolder);

  // Load all data files
  var dataFiles = files.filter(file => {
    return /talos\/datazilla\.json$/.test(file) && /aws-x10/.test(file);
  }).map(file => {
    file = file.substr(resultFolder.length + 1);
    var name = file.substr(0, file.length - "/talos/datazilla.json".length);
    name = name.split('/');
    var name3 = name[3];
    name[3] = name[4]
    name[4] = name3;
    return {
      file: name.join('/'),
      data: JSON.parse(fs.readFileSync(path.join(resultFolder, file), {
        encoding: 'utf8'
      }))
    };
  });

  // Find configuration names (last folder is revision)
  var configurationNames = _.uniq(dataFiles.map(({file}) => {
    return file.split('/').slice(0, -1).join('/');
  }));
  // Find revisions under consideration
  var revisions = _.uniq(dataFiles.map(({file}) => {
    return file.split('/').pop();
  })).sort();
  assert(revisions.length === 2, "Expected exactly 2 revisions!");

  var revA = revisions[0];
  var revB = revisions[1];

  // Get tests and cases from dataFile object
  var getTestsAndCases = (file) => {
    // For each test under consideration (from TESTS environment variable)
    var tests = {}; // Mapping from: suiteName      -> result object
    var cases = {}; // Mapping from: suiteName+case -> array of results
    for (var suiteName of testNames) {
      tests[suiteName] = _.find(file.data, r => {
        return r.testrun.suite === suiteName;
      });
      assert(tests[suiteName], "Missing test: " + suiteName + " for " + file.file);
      // We call all entries in the test suite for cases, and name them as
      // suite + case, to build a dictionary of them:
      for (var caseName of _.keys(tests[suiteName].results)) {
        cases[suiteName + ':' + caseName] = tests[suiteName].results[caseName];
      }
    }
    return {
      data: file.data, tests, cases
    };
  };

  var configurations = configurationNames.map(confName => {
    // Find files from dataFiles
    var fileA = _.find(dataFiles, ({file}) => {
      return file === [confName, revA].join('/');
    });
    var fileB = _.find(dataFiles, ({file}) => {
      return file === [confName, revB].join('/');
    });
    if (!fileA || !fileB) {
      console.log("Skipping %s don't have two files", confName);
    }

    var A = getTestsAndCases(fileA);
    var B = getTestsAndCases(fileB);

    return {
      name:     confName,
      dataA:    A.data,
      testsA:   A.tests,
      casesA:   A.cases,
      dataB:    B.data,
      testsB:   B.tests,
      casesB:   B.cases
    };
  });

  // Find all test cases
  var allTestCases = _.union.apply(_, configurations.map(conf => {
    return _.union(
      _.keys(conf.casesA),
      _.keys(conf.casesB)
    );
  }));

  // Filter out configurations without all test cases
  configurations = configurations.filter(conf => {
    for (var testCase of allTestCases) {
      if (!conf.casesA[testCase] || !conf.casesB[testCase]) {
        return false;
      }
    }
    return true;
  });


  var instNames = _.uniq(configurationNames.map(name => {
    return name.split('/').slice(0, -1).join('/');
  }));
  var instances = instNames.map(name => {
    var confs = configurations.filter(c => {
      return c.name.split('/').slice(0, -1).join('/') === name;
    });
    return {name, confs};
  });


  console.log("Revisions:      " + revA + "    " + revB);
  instances.forEach(inst => {
    console.log("### Std. dev. of GeoMean of medians, for: " + inst.name);
    testNames.forEach(suiteName => {
      var mAs = inst.confs.map(conf => {
        return computeGeoMeanOfMedians(conf.testsA[suiteName].results);
      });
      var mBs = inst.confs.map(conf => {
        return computeGeoMeanOfMedians(conf.testsB[suiteName].results);
      });
      var mA = compute.stdev(mAs);
      var mB = compute.stdev(mBs);
      // Number formatting :)
      mA = (Math.round(mA * 100) / 100).toFixed(2) + '';
      mB = (Math.round(mB * 100) / 100).toFixed(2) + '';
      while(mA.length < 6) mA = ' ' + mA;
      while(mB.length < 6) mB = ' ' + mB;
      var name = suiteName + ':';
      while(name.length < 60) {
        name += " ";
      }
      console.log("%s  %s  %s", name, mA, mB);
    });
  });


  console.log("Revisions:      " + revA + "    " + revB);
  instances.forEach(inst => {
    console.log("### GeoMean of medians, for: " + inst.name);
    testNames.forEach(suiteName => {
      var mAs = inst.confs.map(conf => {
        return computeGeoMeanOfMedians(conf.testsA[suiteName].results);
      });
      var mBs = inst.confs.map(conf => {
        return computeGeoMeanOfMedians(conf.testsB[suiteName].results);
      });
      var name = suiteName + ',';
      while(name.length < 10) {
        name += " ";
      }
      var fmt  = (n) => {
        return (Math.round(n * 100) / 100).toFixed(2) + '';
      };
      console.log("%s %s,  %s", name, revA, mAs.map(fmt).join(', '));
      console.log("%s %s,  %s", name, revB, mBs.map(fmt).join(', '));
      fs.writeFileSync()
    });
  });



  return;


  // For each configuration, we go over all test suites computes the geo mean
  // of medians for all test cases and compare these...
  configurations.forEach(conf => {
    console.log("\n### Comparing Tests Using: %s", conf.name);
    var largestChange = 0;
    var largestChangeSuite = "";
    testNames.forEach(suiteName => {
      var mA = computeGeoMeanOfMedians(conf.testsA[suiteName].results);
      var mB = computeGeoMeanOfMedians(conf.testsB[suiteName].results);
      // Estimate a relative change in geometric mean, we do this as
      // difference between the two geometric means, divided by the average of
      // two means... This way we get a relative value. It's not perfect :)
      var change = Math.abs((mA - mB) / ((mA + mB) / 2.0)) * 100;
      if (change > largestChange) {
        largestChange = change;
        largestChangeSuite = suiteName;
      }
      // Number formatting :)
      mA = (Math.round(mA * 100) / 100).toFixed(2) + '';
      mB = (Math.round(mB * 100) / 100).toFixed(2) + '';
      while(mA.length < 6) mA = ' ' + mA;
      while(mB.length < 6) mB = ' ' + mB;
      var name = suiteName + ':';
      while(name.length < 60) {
        name += " ";
      }
      console.log("%s  %s  %s", name, mA, mB);
    });
    console.log("Largest Relative Change:            %s %  (%s)",
                (Math.round(largestChange * 100) / 100).toFixed(2),
                largestChangeSuite);
    conf.largestRelativeChange  = largestChange;
    conf.largestChangeSuite     = largestChangeSuite;
  });

  console.log("\n\n### Configurations Rank by Largest Relative Change");
  configurations.sort((a, b) => {
    return b.largestRelativeChange - a.largestRelativeChange;
  });
  configurations.forEach(conf => {
    var name = conf.name + ':';
      while(name.length < 60) {
        name += " ";
      }
    console.log(
      "%s %s % (%s)", name,
      (Math.round(conf.largestRelativeChange * 100) / 100).toFixed(2),
      conf.largestChangeSuite
    );
  });

  // Just playing around... This is how we ought to compare revisions.
  // Well, students t-test might not be the only option, But this basically
  // compares two samples to see if they are from the same population.
  // We can numbers all around, in both cases. But hacking around with this
  // it's easy to get the feeling that there probably is a statistically valid
  // manner to determine if there is a regression. Similarly this can be used
  // to identify noisy tests that produce random data. It might be feasible to
  // model this with some AI models like Bayesian networks or Markow chains.
  // We could totally learn whether or not there is a regression, but it would
  // require a lot of good / bad revision data, and this data would have to be
  // relatively high quality. I suspect even a naive Bayesian model would beat
  // humans at interpreting the performance numbers.
  /*
  printPropabilityOfRegression(
    "Two different machines (different regions) comparing A and B",
    getTestsAndCases(_.find(dataFiles, {
      file: 'aws/c4.large/us-east-1/xvfb/' + revA
    })),
    getTestsAndCases(_.find(dataFiles, {
      file: 'aws/c4.large/us-west-1/xvfb/' + revB
    }))
  );
  printPropabilityOfRegression(
    "Two different machines (different regions) comparing A",
    getTestsAndCases(_.find(dataFiles, {
      file: 'aws/c4.large/us-east-1/xvfb/' + revA
    })),
    getTestsAndCases(_.find(dataFiles, {
      file: 'aws/c4.large/us-west-1/xvfb/' + revA
    }))
  );*/

};


// Run main if this is the main function
if (!module.parent) {
  main(process.argv).catch(err => {
    console.log(err.stack);
  });
}






