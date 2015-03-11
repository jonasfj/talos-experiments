import request            from 'superagent-promise';
import Promise            from 'promise';
import _                  from 'lodash';
import assume             from 'assume';
import compute            from 'compute.io';
import React              from 'react';
import bs                 from 'react-bootstrap';

// Track data set
var dataset = [];
var ALL_MEASURES = ['stddev', 'mean', 'median', 'norstddev'];

// Load data from source
var loadData = async (source) => {
  try {
    var res = await request.get(source).end();
    assume(res.ok).to.be.true();
    return res.body;
  }
  catch(err) {
    console.log(err.stack);
    throw err;
  }
};

// Get list of data points
var getDataPoints = () => {
  return [].concat.apply([], dataset.map(suites => {
    return [].concat.apply([], suites.map(suite => {
      var suiteName = suite.testrun.suite;
      var branch    = suite.test_build.branch;
      var revision  = suite.test_build.revision;
      return _.map(suite.results, (results, test) => {
        return {
          test,
          suiteTestName:  suiteName + ':' + test,
          branchRevision: branch + '/' + revision,
          results,
          branch,
          revision,
          suite:      suiteName,
          stddev:     compute.stdev(results),
          mean:       compute.mean(results),
          median:     compute.median(results),
          norstddev:  (compute.stdev(results) / compute.mean(results))
        };
      });
    }));
  }));
};

// Show graph for a row
var showRow = (row) => {
  React.render((
    <span>
      <hr/>
      <h1 style={{textAlign: 'center'}}>{row.suite + ': ' + row.test}</h1>
      {
        row.branchRevisions.map((br, i) => {
          return <div className='col-md-6' id={'graph-' + i}></div>;
        })
      }
    </span>
  ), $("#graph")[0]);
  row.branchRevisions.map((br, i) => {
    MG.data_graphic({
      title:            br,
      data:             row['results-' + br].map((r,i) => { return {r,i}; }),
      target:           "#graph-" + i,
      x_accessor:       "i",
      y_accessor:       "r",
      height:           300,
      full_width:       true,
      chart_type:       "bar",
      bar_orientation:  'vertical',
      show_tooltips:    true
    });
  });
  $("html, body").animate({ scrollTop: $(document).height() }, "slow");
};

// Measures, revisions and suites to render
var filter_measures = ALL_MEASURES;
var filter_revisions = null;
var filter_suites = null;


// Render graph from dataset
var renderGraph = () => {
  var data = getDataPoints().filter(e => {
    return (!filter_revisions || _.includes(filter_revisions, e.revision)) &&
           (!filter_suites    || _.includes(filter_suites, e.suite));
  });
  var measures        = filter_measures;
  var branchRevisions = _.uniq(data.map(e => { return e.branchRevision; }));
  var suiteTests      = _.uniq(data.map(e => { return e.suiteTestName; }));
  var rows = suiteTests.map(suiteTestName => {
    var cols = data.filter(e => { return e.suiteTestName === suiteTestName; });
    var row = _.omit(cols[0], measures);
    for(var col of cols) {
      for(var measure of measures) {
        row[measure + '-' + col.branchRevision] = col[measure];
      }
      row['results-' + col.branchRevision] = col.results;
      row.branchRevisions = branchRevisions;
    }
    return row;
  });

  var table = (
    <bs.Table>
      <thead><tr key="head">
        <th key="case">Case</th>
        {
          [].concat.apply([], branchRevisions.map((branchRevision, index) => {
            return measures.map(measure => {
              var tip = <bs.Tooltip>
                {measure} for:<br/> <strong>{branchRevision}</strong>
              </bs.Tooltip>;
              return (
                <bs.OverlayTrigger key={measure + index}
                                   placement="top" overlay={tip}>
                  <th className="number-cell">{measure} {index + 1}</th>
                </bs.OverlayTrigger>
              );
            });
          }))
        }
      </tr></thead>
      <tbody>
        {
          rows.map((row, index) => {
            var name = row.suite + ': ' + row.test;
            var nametip = <bs.Tooltip>{name}</bs.Tooltip>;
            return <tr key={index}>
              <bs.OverlayTrigger key="name"
                                   placement="top" overlay={nametip}>
                <td onClick={showRow.bind(null, row)}>{name.substr(0, 30)}</td>
              </bs.OverlayTrigger>
              {
                [].concat.apply([], branchRevisions.map(branchRevision => {
                  return measures.map(measure => {
                    return (
                      <td key={measure + '-' + branchRevision}
                          className="number-cell">
                        {row[measure + '-' + branchRevision].toFixed(2)}
                      </td>
                    );
                  });
                }))
              }
            </tr>;
          })
        }
      </tbody>
    </bs.Table>
  );

  //$('#table').empty();
  //$('#table').text("got " + rows.length);
  React.render(table, $('#table')[0]);

  /*var table = MG.data_table({
    title:          "Results",
    data:           rows,
    description:    "some description",
    show_tooltips:  true
  })
  .target('#table')
  .title({
    label:              "Suite/Test",
    accessor:           'test',
    secondary_accessor: 'suite'
  });
  branchRevisions.forEach((branchRevision, index) => {
    for(var measure of measures) {
      table.number({
        label:              measure + ' ' + (index + 1),
        description:        measure + " for <br>" + branchRevision,
        accessor:           measure + '-' + branchRevision,
        round:              2
      });
    }
  });
  table.display();*/

  /*
  //modify away!
  MG.data_graphic({
    title: "UFO Sightings",
    description: "Yearly UFO sightings from 1945 to 2010.",
    data:   data,
    target: "#graph",
    x_accessor: "offset",
    y_accessor: "relativeStddev",
    height: 300,
    full_width: true,
    //full_height: true,
    chart_type: "point",
    bar_orientation: 'vertical',
    show_tooltips: true,
    x_axis: false
  });*/
};

// Render filtering buttons
var renderButtons = () => {
  var data = getDataPoints();

  $('#buttons').empty();
  MG.button_layout('#buttons')
  .data([].concat(data, ALL_MEASURES.map(measure => { return {measure}; })))
  .button('suite', 'Suite ')
  .button('revision', 'Revision ')
  .button('measure', 'Measures ')
  .callback((key, value) => {
    if (key === 'suite') {
      filter_suites = value === 'all' ? null : [value];
    }
    if (key === 'revision') {
      filter_revisions = value === 'all' ? null : [value];
    }
    if (key === 'measure') {
      filter_measures = value === 'all' ? ALL_MEASURES : [value];
    }
    renderGraph();
    return false;
  })
  .display();
};

// Add data to data-set
var addData = async (source) => {
  var data = await loadData(source);
  data = data.filter(result => {
    return result.test_machine.platform === 'x86_64' &&
           result.test_machine.os == 'linux';
  });
  dataset.push(data);
  renderGraph();
  renderButtons();
};

// Setup event handlers
$(() => {
  $('#load-button').click(() => {
    var source = $('#input-link').val();
    addData(source);
  });

  // Add some data to play with
  addData('https://s3-us-west-2.amazonaws.com/jonasfj-talos-test-results/datazilla.mozilla.org/mozilla-inbound-non-pgo/fe5c25b8b675/talos/datazilla.json');
  addData('https://s3-us-west-2.amazonaws.com/jonasfj-talos-test-results/datazilla.mozilla.org/mozilla-inbound-non-pgo/c448634fb6c9/talos/datazilla.json');
});

