const debug = require('debug')('keystone:core:openDatabaseConnection');

module.exports = function openDatabaseConnection(callback) {
  const keystone = this;
  let mongoConnectionOpen = false;

  if (keystone.get('mongo replica set')) {
    if (keystone.get('logger')) {
      console.warn(
        '\nWarning: using the `mongo replica set` option has been deprecated and will be removed in' +
          ' a future version.\nInstead set the `mongo` connection string with your host details, e.g.' +
          ' mongodb://username:password@host:port,host:port,host:port/database and set any replica set options' +
          ' in `mongo options`.\n\nRefer to https://mongodb.github.io/node-mongodb-native/driver-articles/mongoclient.html' +
          ' for more details on the connection settings.'
      );
    }

    debug('setting up mongo replica set');
    const replicaData = keystone.get('mongo replica set');
    let replica = '';

    const credentials =
      replicaData.username && replicaData.password
        ? replicaData.username + ':' + replicaData.password + '@'
        : '';

    replicaData.db.servers.forEach(function (server) {
      replica +=
        'mongodb://' +
        credentials +
        server.host +
        ':' +
        server.port +
        '/' +
        replicaData.db.name +
        ',';
    });

    const options = {
      auth: { authSource: replicaData.authSource },
      replSet: {
        name: replicaData.db.replicaSetOptions.rs_name,
        readPreference: replicaData.db.replicaSetOptions.readPreference,
      },
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    debug('connecting to replica set');
    keystone.mongoose.connect(replica, options);
  } else {
    debug('connecting to mongo');
    keystone.initDatabaseConfig();
    const mongo_options = keystone.get('mongo options') || {};
    mongo_options.useNewUrlParser = true;
    mongo_options.useUnifiedTopology = true;
    keystone.mongoose.connect(keystone.get('mongo'), mongo_options);
  }

  keystone.mongoose.connection
    .on('error', function (err) {
      if (mongoConnectionOpen && err && err.name === 'ValidationError') return;

      console.error('------------------------------------------------');
      console.error('Mongoose connection "error" event fired with:');
      console.error(err);

      if (!mongoConnectionOpen) {
        throw new Error(
          'KeystoneJS (' +
            keystone.get('name') +
            ') failed to start - Check that you are running `mongod` in a separate process.'
        );
      }

      throw err;
    })
    .on('open', function () {
      debug('mongo connection open');
      mongoConnectionOpen = true;

      const connected = function () {
        if (keystone.get('auto update')) {
          debug('applying auto update');
          keystone.applyUpdates(callback);
        } else {
          callback();
        }
      };

      if (keystone.sessionStorePromise) {
        keystone.sessionStorePromise.then(connected);
      } else {
        connected();
      }
    });

  return this;
};
