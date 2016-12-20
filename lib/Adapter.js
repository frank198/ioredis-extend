/**
 * Created by frank on 16-11-22.
 */

const _ = require('lodash'),
	co = require('co'),
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
	static *RegisterConnection(connection, collections, prefix = null)
    {
		if (!connection.identity) return new Error('Connection is missing an identity');
		if (connections[connection.identity]) return new Error('Connection is already registered');
		if (!_.isNil(prefix) && !_.isEqual(prefix, ''))
		{
			require('./Utils').Prefix = prefix;
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
        // Register each collection with the database
		_.forEach(collections, (value, key) =>
        {
			activeConnection.database.configure(key, value.definition);
		});
        // Sync the database with redis
		return yield activeConnection.database.sync();
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
		    connections[connectionName].connection.connection.quit();

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
	    try
	    {
		    const connectionObject = connections[connectionName];
		    return connectionObject.database.describe(collectionName);
	    }
	    catch (err)
	    {
		    throw err;
	    }
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
	    try
	    {
		    const connectionObject = connections[connectionName];
		    connectionObject.database.define(collectionName, definition);
	    }
	    catch (err)
	    {
		    throw err;
	    }
	}

    /**
     *  Drop a collection on `collection === tableName`
     *
     * @param connectionName
     * @param collectionName
     * @param relations
     * @returns {*}
     * @constructor
     */
	static *Drop(connectionName, collectionName)
    {
	    try
	    {
		    const connectionObject = connections[connectionName];
		    return yield connectionObject.database.drop(collectionName);
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
	static *Create(connectionName, collectionName, data)
    {
	    try
	    {
		    const connectionObject = connections[connectionName];
		    return yield connectionObject.database.create(collectionName, data);
	    }
	    catch (err)
	    {
		    throw err;
	    }
	}

	static Join(connectionName, collectionName, criteria)
	{
		return new Promise((resolve, reject) =>
		{
            // Ignore `select` from waterline core
			if (_.isObject(criteria) && _.has(criteria, 'select'))
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
					co(connectionObject.database.find(collectionIdentity, criteria))
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
					return connectionObject.database.schema.primary[collectionIdentity.toLowerCase()];
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
     * @param {Function} callback invoked with `err, records`
     */

	static *Find(connectionName, collectionName, criteria)
    {
	    try
	    {
		    const connectionObject = connections[connectionName];
		    return yield connectionObject.database.find(collectionName, criteria);
	    }
	    catch (err)
	    {
		    throw err;
	    }
	}

	/**
	 *  Find record based on primaryKey
	 * @param {String} connectionName
	 * @param {String} collectionName
	 * @param {string } primaryKey
	 * @param {string | Array} fields 指定返回的数据
	 * @constructor
	 */
	static *Get(connectionName, collectionName, primaryKey, fields = [])
	{
		try
		{
			const connectionObject = connections[connectionName];
			return yield connectionObject.database.get(collectionName, primaryKey, fields);
		}
		catch (err)
		{
			throw err;
		}
	}

	static *Keys(connectionName, collectionName)
	{
		try
		{
			const connectionObject = connections[connectionName];
			return yield connectionObject.database.keys(collectionName);
		}
		catch (err)
		{
			throw err;
		}
	}

	/**
	 *  查找是否存在指定的 primaryKey
	 * @param connectionName
	 * @param collectionName
	 * @param primaryKey
	 * @returns {Boolean}
	 */
	static *HasKey(connectionName, collectionName, primaryKey)
	{
		try
		{
			const connectionObject = connections[connectionName];
			return yield connectionObject.database.hasKey(collectionName, primaryKey);
		}
		catch (err)
		{
			throw err;
		}
	}

	static *DeleteKeys(connectionName, collectionName, criteria, ...keys)
	{
		try
		{
			const connectionObject = connections[connectionName];
			return yield connectionObject.database.deleteKeys(collectionName, criteria, ...keys);
		}
		catch (err)
		{
			throw err;
		}
	}

    /**
     * Update records based on criteria
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} criteria
     * @param {Object} values
     */
	static *Update(connectionName, collectionName, criteria, values)
    {
	    try
	    {
		    const connectionObject = connections[connectionName];
		    return yield connectionObject.database.update(collectionName, criteria, values);
	    }
	    catch (err)
	    {
		    throw err;
	    }
	}

    /**
     * Destroy records based on criteria
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} criteria
     */
	static *Destroy(connectionName, collectionName, criteria)
    {
	    try
	    {
		    const connectionObject = connections[connectionName];
		    return yield connectionObject.database.destroy(collectionName, criteria);
	    }
	    catch (err)
	    {
		    throw err;
	    }
	}

    /**
     * Return the native redis object.
     */
	static Native(connectionName)
    {
	    try
	    {
		    const connectionObject = connections[connectionName];
		    const connection = connectionObject.database.redisConnection;
		    return connection;
	    }
	    catch (err)
	    {
		    throw err;
	    }
	}
}

module.exports = Adapter;