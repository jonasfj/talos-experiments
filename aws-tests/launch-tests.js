import {execSync}         from 'child_process';
import fs                 from 'fs';
import _                  from 'lodash';
import assert             from 'assert';
import replaceall         from 'replaceall';
import aws                from 'aws-sdk-promise';
var exec = cmd => { return execSync(cmd).toString('utf-8'); };

var ebsAMIs = {
  'ap-northeast-1':   'ami-8f876e8f',
  'ap-southeast-1':   'ami-62546230',
  'eu-central-1':     'ami-e6a694fb',
  'eu-west-1':        'ami-edfd6e9a',
  'sa-east-1':        'ami-a757eeba',
  'us-east-1':        'ami-6889d200',
  'us-west-1':        'ami-c37d9987',
  'cn-north-1':       'ami-de36a4e7',
  'us-gov-west-1':    'ami-3d52331e',
  'ap-southeast-2':   'ami-c94e3ff3',
  'us-west-2':        'ami-35143705'
};

var instanceStoreHVMAMIs = {
  'ap-northeast-1':   'ami-47876e47',
  'ap-southeast-1':   'ami-4854621a',
  'eu-central-1':     'ami-9ea69483',
  'eu-west-1':        'ami-e1f96a96',
  'sa-east-1':        'ami-9f57ee82',
  'us-east-1':        'ami-0696cd6e',
  'us-west-1':        'ami-bd7c98f9',
  'cn-north-1':       'ami-e836a4d1',
  'us-gov-west-1':    'ami-23523300',
  'ap-southeast-2':   'ami-ed4e3fd7',
  'us-west-2':        'ami-bb16358b'
};

var INSTANCE_TYPES = [
  // General Purpose
  'm3.medium',
  'm3.xlarge',
  'm3.2xlarge',
  // Compute Optimized (4th Generation)
  'c4.large',
  'c4.xlarge',
  'c4.2xlarge',
  // Compute Optimized (3rd Generation)
  'c3.large',
  'c3.xlarge',
  'c3.2xlarge',
  // GPU Instances
  'g2.2xlarge',
  // Memory Optimized
  'r3.large',
  'r3.xlarge'
  // */
];

var REGIONS = [
  // Old region
  'us-east-1',
  // New region
  //'eu-central-1', // doesn't have C4 instances
  // Region close by
  'us-west-1'
];

// Load userData template
var userDataTemplate = fs.readFileSync(__dirname + '/user-data-script.sh.in')
                         .toString('utf-8');
// Substitute parameters into userData
var userData = (options) => {
  var data = userDataTemplate;
  _.forEach(options, (value, key) => {
    data = replaceall('{{' + key + '}}', value, data);
  });
  return new Buffer(data).toString('base64');
};

// Export userData
exports.userData = userData;

// Main function
var main = async (argv) => {
  var action = argv[2];
  var image = argv[3];
  var keyName         = process.env.EC2_KEY_NAME;
  var accessKeyId     = process.env.AWS_EC2_ACCESS_KEY_ID;
  var secretAccessKey = process.env.AWS_EC2_SECRET_ACCESS_KEY;
  assert(image,           "Missing argument [image]");
  assert(keyName,         "Missing EC2_KEY_NAME");
  assert(accessKeyId,     "Missing AWS_EC2_ACCESS_KEY_ID");
  assert(secretAccessKey, "Missing AWS_EC2_SECRET_ACCESS_KEY");

  // Declare static options
  var baseOptions = {
    TESTS:                  process.env.TESTS,
    AWS_ACCESS_KEY_ID:      process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY:  process.env.AWS_SECRET_ACCESS_KEY,
    AWS_DEFAULT_REGION:     process.env.AWS_DEFAULT_REGION,
    RESULT_BUCKET:          process.env.RESULT_BUCKET,
    RESULT_PREFIX:          process.env.RESULT_PREFIX,
    INPUT_URL:              process.env.INPUT_URL,
    REGISTRY_USERNAME:      process.env.REGISTRY_USERNAME,
    REGISTRY_PASSWORD:      process.env.REGISTRY_PASSWORD,
    REGISTRY_EMAIL:         process.env.REGISTRY_EMAIL,
    REGISTRY_HOST:          process.env.REGISTRY_HOST,
    TALOS_TESTER:           image
  };

  var dryrun = false;
  if (action === 'render') {
    dryrun = true;
    console.log("dryrun");
  } else if (action !== 'launch') {
    console.log("Unknown action!");
  }

  console.log("Launching instances, with base options:");
  console.log(JSON.stringify(baseOptions, null, 2));

  for(var region of REGIONS) {
    var ec2 = new aws.EC2({accessKeyId, secretAccessKey, region});
    for(var instanceType of INSTANCE_TYPES) {
      var options = _.defaults({
        REGION:             region,
        INSTANCE_TYPE:      instanceType
      }, baseOptions);
      console.log("Launching %s in %s", instanceType, region);
      if (dryrun) {
        console.log("dry run so skipping launch, but config is:");
        var data = new Buffer(userData(options), 'base64').toString('utf8');
        console.log(data);
        continue;
      }
      await ec2.runInstances({
        ImageId:        ebsAMIs[region],
        MaxCount:       1,
        MinCount:       1,
        InstanceInitiatedShutdownBehavior:    'terminate',
        InstanceType:   instanceType,
        KeyName:        keyName,
        SecurityGroups: ['ssh-only'],
        UserData:       userData(options)
      }).promise();
    }
  }
  console.log("done");
};

// Run main if this is the main function
if (!module.parent) {
  main(process.argv).catch(err => {
    console.log(err.stack);
  });
}
