var express     = require('express')
var babelify    = require('babelify');
var browserify  = require('connect-browserify')
var app = express()

app.use('/app.js', browserify({
  entry:      __dirname + '/src/app.jsx',
  transforms: [
    babelify.configure({
      experimental:     true,
      optional:         ['runtime']
    })
  ],
  onError: function(err) {
    console.warn(err.message);
  }
}));

app.use('/',  express.static(__dirname + '/static'));
app.get('/', function(req,res) {
  res.sendFile(__dirname + '/static/index.htm');
});

app.listen(3030);