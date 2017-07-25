/**
 * Created by frank on 16-11-22.
 */

const utils = require('./Utils'),
	Database = require('./database/Index'),
	_runJoins = require('waterline-cursor'),
	Connection = require('./Connection');

const connections = {};

class Adapter
{
    /**
     * Register A Connection
     *
     * Will open up a new connection using the configuration provided and store the DB
     * object to run commands off of.
     *
     * @param {Object} connection
     * @param {Object} collections
     * @param {String} prefix
     */
	static async RegisterConnection(connection, collections, prefix = null)
    {
		if (!connection.identity) return new Error('Connection is missing an identity');
		if (connections[connection.identity]) return new Error('Connection is already registered');
		if (!utils.isNil(prefix) && prefix !== '')
		{
			utils.Prefix = prefix;
		}

        // Store the connection
		connections[connection.identity] = {
			config      : connection,
			collections : {}
		};

	    const activeConnection = connections[connection.identity];
	    // Create a new active connection
	    const conn = new Connection(connection);
	    // Store the live connection
	    activeConnection.connection = conn;
	    // Create a new database with the active connection
	    activeConnection.database = new Database(conn.redisConnection);

	    // Sync the database with redis
	    for (const key of Object.keys(collections))
		    activeConnection.database.configure(key, collections[key].definition);
	    // Register each collection with the database
	    return await activeConnection.database.sync();
	}

    /**
     * Teardown
     *
     * Closes the connection and removes the connection object from the registry.
     *
     * @param {String} connectionName
     */
	static Teardown(connectionName)
    {
	    try
	    {
		    if (!connections[connectionName]) return;

		    // Drain the connection pool if available
		    connections[connectionName].connection.redisConnection.quit();

		    // Remove the connection from the registry
		    delete connections[connectionName];
	    }
	    catch (err)
	    {
		    throw err;
	    }
	}

    /**
     * Describe a collection on `collection === tableName`
     *
     * @param {String} connectionName
     * @param {String} collectionName
     */
	static Describe(connectionName, collectionName)
    {
	    const connectionObject = connections[connectionName];
	    return connectionObject.database.describe(collectionName);
	}

    /**
     *  Define a collection.
     *
     * @param connectionName
     * @param collectionName
     * @param definition
     * @returns {*}
     * @constructor
     */
	static Define(connectionName, collectionName, definition)
    {
	    const connectionObject = connections[connectionName];
	    connectionObject.database.define(collectionName, definition);
	}

    /**
     *  Drop a collection on `collection === tableName`
     *
     * @param connectionName
     * @param collectionName
     * @returns {*}
     * @constructor
     */
	static async Drop(connectionName, collectionName)
    {
	    try
	    {
		    const connectionObject = connections[connectionName];
		    return await connectionObject.database.drop(collectionName);
	    }
	    catch (err)
	    {
		    throw err;
	    }
	}

    /**
     * Create a new record from `data`
     * - Ensure record unique keys are unique
     * - attempts to get meta data or creates them
     * - ensures the primary key is present and unique
     * - saves the data to database updating all unique index sets
     *
     * @param connectionName
     * @param collectionName
     * @param data
     * @returns {*}
     * @constructor
     */
	static async Create(connectionName, collectionName, data)
    {
	    const connectionObject = connections[connectionName];
	    return await connectionObject.database.create(collectionName, data);
	}

	static Join(connectionName, collectionName, criteria)
	{
		return new Promise((resolve, reject) =>
		{
            // Ignore `select` from waterline core
			if (typeof criteria === 'object' && criteria.hasOwnProperty('select'))
			{
				delete criteria.select;
			}
            // Populate associated records for each parent result
            // (or do them all at once as an optimization, if possible)
			_runJoins({

				instructions     : criteria,
				parentCollection : collectionName,

                /**
                 * Find some records directly (using only this adapter)
                 * from the specified collection.
                 *
                 * @param  {String}   collectionIdentity
                 * @param  {Object}   criteria
                 * @param  {Function} cb
                 */
				$find : function(collectionIdentity, criteria, cb)
                {
					const connectionObject = connections[connectionName];
					connectionObject.database.find(collectionIdentity, criteria)
						.then(result => {cb(null, result);})
                        .catch(err => {cb(err);});
				},

                /**
                 * Look up the name of the primary key field
                 * for the collection with the specified identity.
                 *
                 * @param  {String}   collectionIdentity
                 * @return {String}
                 */
				$getPK : function(collectionIdentity)
                {
					if (!collectionIdentity) return;
					const connectionObject = connections[connectionName];
					return connectionObject.database.schema.primaryKey(collectionIdentity);
				}
			}, (err, result) =>
			{
				if (err) return reject(err);
				return resolve(result);
			});
		});
	}

    /**
     * Find records based on criteria in `criteria`
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} criteria
     */

	static async Find(connectionName, collectionName, criteria)
    {
	    const connectionObject = connections[connectionName];
	    return await connectionObject.database.find(collectionName, criteria);
	}

	/**
	 *  Find record based on primaryKey
	 * @param {String} connectionName
	 * @param {String} collectionName
	 * @param {string } primaryKey
	 * @param {string | Array} fields 指定返回的数据
	 * @constructor
	 */
	static async Get(connectionName, collectionName, primaryKey, fields = [])
	{
		const connectionObject = connections[connectionName];
		return await connectionObject.database.get(collectionName, primaryKey, fields);
	}

	static async Keys(connectionName, collectionName)
	{
		const connectionObject = connections[connectionName];
		return await connectionObject.database.keys(collectionName);
	}

	/**
	 *  查找是否存在指定的 primaryKey
	 * @param connectionName
	 * @param collectionName
	 * @param primaryKey
	 * @returns {Boolean}
	 */
	static async HasKey(connectionName, collectionName, primaryKey)
	{
		const connectionObject = connections[connectionName];
		return await connectionObject.database.hasKey(collectionName, primaryKey);
	}

	static async DeleteKeys(connectionName, collectionName, criteria, ...keys)
	{
		const connectionObject = connections[connectionName];
		return await connectionObject.database.deleteKeys(collectionName, criteria, ...keys);
	}

    /**
     * Update records based on criteria
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} criteria
     * @param {Object} values
     */
	static async Update(connectionName, collectionName, criteria, values)
    {
	    const connectionObject = connections[connectionName];
	    return await connectionObject.database.update(collectionName, criteria, values);
	}

    /**
     * Destroy records based on criteria
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} criteria
     */
	static async Destroy(connectionName, collectionName, criteria)
    {
	    const connectionObject = connections[connectionName];
	    return await connectionObject.database.destroy(collectionName, criteria);
	}

    /**
     * Return the native redis object.
     */
	static Native(connectionName)
    {
	    const connectionObject = connections[connectionName];
	    return connectionObject.database.redisConnection;
	}
}

module.exports = Adapter;