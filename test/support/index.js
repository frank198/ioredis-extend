/**
 * Expose `Support`
 */

const co = require('co');

module.exports = function(adapter)
{
	const Support = {};

  /**
   * Configure helper
   * - using default redis config
   *
   * @param {String} name
   * @param {Object} definition
   */

	Support.Configure = function(name, definition)
{
		return {
			identity   : name,
			definition : definition
		};
	};

  /**
   * Setup function
   *
   * @param {String} collection
   * @param {Object} def
   * @param {Function} callback
   */

	Support.Setup = function(conn, name, def, callback)
{
		const connection = {
			identity : conn,
			port     : 6800,
			host     : '192.168.31.233',
			password : 'gameMirror',

      // sentinels: [{ host: 'localhost', port: 26379 }],
      // name: 'master'
			hosts : [
				{
					host : '192.168.31.233',
					port : 7001,
				},
				{
					host : '192.168.31.233',
					port : 7002,
				},
				{
					host : '192.168.31.233',
					port : 7003,
				},
				{
					host : '192.168.31.233',
					port : 7004,
				},
				{
					host : '192.168.31.233',
					port : 7005,
				},
				{
					host : '192.168.31.233',
					port : 7006,
				},
			],
		};

		const collection = this.Configure(name, def);
		collection.definition.connection = conn;

		const collections = {};
		collections[name] = collection;

		co(adapter.RegisterConnection(connection, collections))
        .then(callback);
	};

  /**
   * Teardown function
   *
   * @param {String} collection
   * @param {Function} callback
   */

	Support.Teardown = function(conn, collection, callback)
  {

		co(adapter.Drop(conn, collection, []))
          .then(() =>
          {
	adapter.Teardown(conn);
	callback();
});
	};

	return Support;
};
