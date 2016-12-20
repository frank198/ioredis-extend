/**
 * Created by frank on 16-11-22.
 */

const Schema = require('./Schema'),
	_ = require('lodash'),
	co = require('co'),
	WaterlineCriteria = require('waterline-criteria'),
	Utils = require('../Utils'),
	Aggregate = require('../Aggregates'),
	Errors = require('../Errors');

class Index
{
	constructor(redisConnection)
    {
		this.redisConnection = redisConnection || {};
		this.definedCollections = {};
		this.schema = new Schema(redisConnection);
	}

    /**
     * Configure the "database" for a collection.
     * @param {string} collectionName
     * @param {object} schema
     */
	configure(collectionName, schema)
    {
		const name = collectionName.toLowerCase();
		this.schema.registerCollection(name, schema);
	}

    /**
     * Sync the "database" to redis
     * @returns {*}
     * @api public
     */
	*sync()
    {
		return yield this.schema.sync();
	}

    /**
     * Describe the schema for a collection.
     * @param {String} collectionName
     * @api public
     */
	describe(collectionName)
    {
		const name = collectionName.toLowerCase();
		let desc = this.schema.retrieve(name);

		if (!desc) return new Error(Errors.adapter.CollectionNotRegistered);
		if (_.size(desc) === 0) desc = null;

		if (!this.definedCollections[collectionName]) desc = null;

		return desc;
	}

    /**
     * Define the schema for a collection.
     *
     * @param {String} collectionName
     * @param {Object} definition
     * @api public
     */
	define(collectionName, definition)
    {
		const name = collectionName.toLowerCase();
		this.schema.registerCollection(name, definition);

        // Hack needed for migrate: safe to return nothing when described
		this.definedCollections[collectionName] = true;
	}

    /**
     * Drop a collection and all of it's keys.
     *
     * @param {String} collectionName
     * @param {Array} relations
     * @param {Function} callback
     * @api public
     */
	*drop(collectionName)
    {
		const name = collectionName.toLowerCase();

        // Cache key values 获取 schema 缓存中的值
		const primary = this.schema.primary[name],
			sequences = this.schema.sequences[name],
			indices = this.schema.uniqueIndices[name];

		const index = this.schema.indexKey(name, primary);

		const schemas = _.concat(sequences, indices);
		let keys = _.map(schemas, 'keyName');
        // Add the main primary key index to the keys array
		keys.push(index);

		try
        {
			const values = yield this.redisConnection.smembers(index);
            // Add the member keys onto the keys array
			keys = keys.concat(values);
			const promiseArr = [];
			keys.forEach(key =>
			{
				promiseArr.push(this.redisConnection.del(key));
			});
			yield promiseArr;
			this.schema.schema[collectionName] = {};
		}
		catch (err)
        {
			throw err;
		}
	}

    /**
     * Find a record or set of records based on a criteria object.
     *
     * @param {String} collectionName
     * @param {Object} criteria
     * @api public
     */
	*find(collectionName, criteria)
    {
		const name = collectionName.toLowerCase();
		const options = {};
		let recordKey;

        // Find the attribute used as a primary key
		const primary = this.schema.primary[name];

        // Find the index key used to keep track of all the keys in this collections
		const indexKey = this.schema.indexKey(name, primary);

        // If the primary key is contained in the criteria and it is not an object/array), a NoSQL key can be
        // constructed and we can simply grab the values. This would be a findOne.
        // if the if statement is true then it can simply grab the record, but if it has more values than that then
        // it should do some more criteria solving, mainly for join's without unique id's and such
		if (criteria.where && criteria.where.hasOwnProperty(primary) &&
            !_.isArray(criteria.where[primary]) &&
            ! _.isNil(criteria.where[primary]) && _.size(criteria.where) == 1)
        {
			recordKey = this.schema.recordKey(name, primary, criteria.where[primary]);
			try
            {
				let record = yield this.redisConnection.get(recordKey);
				if (!record) return [];
				record = JSON.parse(record);
				return [this.schema.parse(name, record)];
			}
			catch (err)
            {
				return err;
			}
		}

        // Cache any SKIP, LIMIT, SORT criteria params
        // these will be used later after any criteria matches are found
		if (_.has(criteria, 'skip'))
        {
			options.skip = _.cloneDeep(criteria.skip);
			delete criteria.skip;
		}

		if (_.has(criteria, 'limit'))
        {
			options.limit = _.cloneDeep(criteria.limit);
			delete criteria.limit;
		}

		if (_.has(criteria, 'sort'))
        {
			options.sort = _.cloneDeep(criteria.sort);
			delete criteria.sort;
		}
		else
        {
            // Sort by primaryKey asc
			options.sort = {};
			options.sort[primary] = 1;
		}

		try
        {
	        // Get all the record keys belonging to this collection
			const members = yield this.redisConnection.smembers(indexKey);
			let models = [];
			const promiseArr = [];
			_.forEach(members, member =>
			{
				const promiseItem = co(this.redisConnection.get(member))
					.then(result =>
					{
						if (result)
						{
							try
							{
								result = JSON.parse(result);
								// Cast Result Data
								result = this.schema.parse(name, result);

								// Build up a dataset for use with waterline-criteria
								const data = {};
								data[name] = [result];
								// Check for match using waterline-criteria
								const resultSet = WaterlineCriteria(name, data, criteria);
								models = models.concat(resultSet.results);
							}
							catch (err)
							{
								throw err;
							}
						}
					})
					.catch(err => {throw err;});
				promiseArr.push(promiseItem);
			});
			yield promiseArr;
			let resultSet = [];
            // If any processing options were supplied, re-run Waterline-Criteria with the filtered
            // results set. This will process any sorting and pagination options.
			if (_.has(options, 'sort') || _.has(options, 'limit') || _.has(options, 'skip'))
            {
                // Build up a dataset for use with waterline-criteria
				const data = {};
				data[name] = models;

				options.where = {};
				resultSet = WaterlineCriteria(name, data, options).results || [];
			}

            // Process Aggregate Options
			const aggregate = new Aggregate(criteria, resultSet);

			if (aggregate.error) throw aggregate.error;
			return aggregate.result;
		}
		catch (err)
        {
			throw err;
		}
	}

	*get(collectionName, primaryKey, field)
	{
		try
		{
			const fields = [].concat(field);
			const name = collectionName.toLowerCase();
			// Find the attribute used as a primary key
			const primary = this.schema.primary[name];
			const primaryCriteria = {};
			primaryCriteria[primary] = primaryKey;
			const criteria = {
				where : primaryCriteria
			};
			const record = yield this.find(collectionName, criteria);
			if (record.length === 1)
			{
				if (record[0][primary] === primaryKey)
				{
					const singleRecord = record[0];
					const pickSingleRecord = fields.length > 0 ? _.pick(singleRecord, fields) : singleRecord;
					return pickSingleRecord;
				}
				return null;
			}
			else if (record.length > 1)
			{
				throw new Error(`get record by ${primaryKey} result is ${record}`);
			}
			return null;
		}
		catch (err)
		{
			throw err;
		}
	}

	*keys(collectionName)
	{
		const name = collectionName.toLowerCase();
		// Find the attribute used as a primary key
		const primary = this.schema.primary[name];
		// Find the index key used to keep track of all the keys in this collections
		const indexKey = this.schema.indexKey(name, primary);
		// Get all the record keys belonging to this collection
		const members = yield this.redisConnection.smembers(indexKey);
		const mapMembers = _.map(members, (member) => {return _.replace(member, indexKey, '');});
		return mapMembers;
	}

	*hasKey(collectionName, primaryKey)
	{
		const name = collectionName.toLowerCase();
		// Find the attribute used as a primary key
		const primary = this.schema.primary[name];
		// Find the index key used to keep track of all the keys in this collections
		const indexKey = this.schema.indexKey(name, primary);
		const recordKey = yield this.schema.recordKey(collectionName, primary, primaryKey);
		const hasKey = yield this.redisConnection.sismember(indexKey, recordKey);
		return hasKey === 1;
	}

    /**
     *  Create a new record from `data`
     *
     * @param {String} collectionName
     * @param {Object} data
     */
	*create(collectionName, data)
    {
		let name = collectionName.toLowerCase();
		const _data = _.cloneDeep(data),
			sequences = this.schema.sequences[name];

		name = _.isString(name) ? name.replace(/\s/gi, '_') : name;

		try
        {
			yield this.uniqueConstraint(name, data);
			const sequenceNames = _.map(sequences, 'name');
            // Add Auto-Generated Primary Key to indices
            // Check if the primary key is a sequence
			const primary = this.schema.primary[name];
			if (_.isNil(data[primary]) && !_.includes(sequenceNames, primary))
            {
				throw new Error(Errors.adapter.PrimaryKeyMissing);
			}
			const sequenceValues = {};
			const promiseArr = [];
			_.forEach(sequences, item =>
			{
				const itemName = _.get(item, 'name', null);
				let coItem = null;
				if (!_.isNil(itemName))
				{
					if (data[itemName])
					{
						coItem = co(item.set(data[itemName]))
							.then(value =>
							{
								sequenceValues[item.name] = value;
							})
							.catch(err =>
							{
								console.error(err);
							});
					}
					else
					{
						coItem = co(item.increment())
							.then(value =>
							{
								sequenceValues[item.name] = value;
								data[item.name] = parseInt(value, 10);
							})
							.catch(err =>
							{
								console.error(err);
							});
					}
					promiseArr.push(coItem);
				}
			});
			yield promiseArr;
            // Grab the key to use for this record
			let noSqlKey = this.schema.recordKey(name, primary, data[primary]);
			noSqlKey = Utils.Sanitize(noSqlKey);

            // Stringify data for storage
			const parsedData = JSON.stringify(data);
			yield this.redisConnection.set(noSqlKey, parsedData);
			let values = yield this.redisConnection.get(noSqlKey);
			values = JSON.parse(values);

            // Store autoPK flag
			let autoPK = false;
			sequences.forEach(function(sequence)
			{
				if (sequence.name === primary) autoPK = true;
			});
            // If the primary key is not a sequence there is no need to index it.
            // It would have been previously indexed in the unique constraint test
            // If a value was supplied for an autoPK value, it will be indexed by the
            // unique constraint test.
			if (autoPK && !_data[primary])
            {
				const indices = this.schema.uniqueIndices[name];
				_.forEach(indices, idx =>
                {
					if (idx.name === primary)
                    {
						idx.index(Utils.Sanitize(data[primary]));
					}
				});
			}
            // Add Primary Key to indexed set
			const index = this.schema.indexKey(name, primary);
			yield this.redisConnection.sadd(index, noSqlKey);
			return this.schema.parse(name, values);
		}
		catch (err)
        {
			throw err;
		}
	}

    /**
     * Update a record
     *
     * @param {String} collectionName
     * @param {Object} criteria
     * @param {Object} values
     * @api public
     */
	*update(collectionName, criteria, values)
    {
		const name = collectionName.toLowerCase(),
			primary = this.schema.primary[name];

        // Don't allow the updating of primary keys
		if (!_.isNil(values[primary]) && values[primary] !== criteria.where[primary])
		{
			throw new Error(Errors.adapter.PrimaryKeyUpdate);
		}
        // Delete any primary keys
		delete values[primary];

		try
		{

			// 检测自增 key
			const sequences = this.schema.sequences[name];
			let valid = true;
			sequences.forEach(function(sequenceNames)
			{
				if (!_.isNil(values[sequenceNames]))
				{
					valid = false;
				}
			});
			if (!valid)
			{
				throw new Error(Errors.adapter.InvalidAutoIncrement);
			}

			const records = yield this.find(name, criteria);
			const updateKeys = _.keys(values);
			// 检测唯一 key
            // Get Indices
			const indices = this.schema.uniqueIndices[name];
			const indexNames = _.map(indices, 'name');
			const sameIndexNameArr = _.intersection(updateKeys, indexNames);
			if (sameIndexNameArr.length > 0)
			{
				// Check if any unique values are being updated across multiple records
				if (records.length > 1)
				{
					throw new Error('Attempting to update a unique value on multiple records');
				}
				yield this.uniqueConstraint(name, values);
			}

            // Use a MULTI wrapper to ensure the removal and creation of indexes happens atomically
			const multi = this.redisConnection.multi();

			_.forEach(indices, idx =>
            { // Queue up index operations
				const name = idx.name;
				const key = idx.keyName;

                // Indexed value not updated
				if (!_.isNil(values[name]))
                {
                    // Remove the previously indexed values
					records.forEach(record =>
                    {
						multi.srem(key, record[name]);
					});
                    // Add the new indexed value
					multi.sadd(key, values[name]);
				}
			});
			const multiResults = yield multi.exec();
			if (multiResults.indexOf(0) > -1) throw new Error('Error writing index');

			const models = [];
			const promiseArr = [];
			records.forEach(record =>
            {
				const key = this.schema.recordKey(name, primary, record[primary]);
				const updatedValues = _.extend(record, values);
				promiseArr.push(co(this.redisConnection.set(key, JSON.stringify(updatedValues))
					.then(result =>
                    {
						models.push(updatedValues);
					})
                    .catch(err => {throw err;})
                ));
			});
			yield promiseArr;
			return models;
		}
		catch (err)
        {
			throw err;
		}
	}

	/**
	 *  删除指定集合的 key
	 * @param {String} collectionName
	 * @param {Object} criteria
	 * @param {String} key
	 */
	*deleteKeys(collectionName, criteria, ...key)
	{
		const keys = _.concat([], key);
		const name = collectionName.toLowerCase(),
			primary = this.schema.primary[name];
		if (_.includes(keys, primary))
		{
			throw new Error('delete keys has primary Key');
		}
		try
		{
			const sequences = this.schema.sequences[name];
			const sequenceNames = _.map(sequences, 'name');
			const sameSequenceNameArr = _.intersection(keys, sequenceNames);
			if (sameSequenceNameArr.length > 0)
			{
				throw new Error(Errors.adapter.InvalidAutoIncrement);
			}
			const records = yield this.find(name, criteria);

			// Get Indices
			const indices = this.schema.uniqueIndices[name];
			const indexNames = _.map(indices, 'name');
			const sameIndexNameArr = _.intersection(keys, indexNames);
			const models = [];
			const multi = this.redisConnection.multi();
			records.forEach(record =>
			{
				const key = this.schema.recordKey(name, primary, record[primary]);

				if (sameIndexNameArr.length > 0)
				{
					// Use a MULTI wrapper to ensure the removal and creation of indexes happens atomically
					_.forEach(sameIndexNameArr, idx =>
					{ // Queue up index operations
						const name = idx.name;
						const key = idx.keyName;
						multi.srem(key, record[name]);
					});
				}
				const newRecord = _.omit(record, keys);
				multi.set(key, JSON.stringify(newRecord));
				models.push(newRecord);
			});
			const multiResults = yield multi.exec();
			if (multiResults.indexOf(0) > -1) throw new Error('Error writing index');
			return models;
		}
		catch (err)
		{

		}
	}

    /**
     * Destory Record(s)
     *
     * @param {String} collectionName
     * @param {Object} criteria
     * @api public
     */
	*destroy(collectionName, criteria)
    {
		const name = collectionName.toLowerCase(),
			primary = this.schema.primary[name];

		try
        {
            // Find all matching records based on the criteria
			const records = yield this.find(name, criteria);

            // Get Indices
			const indices = this.schema.uniqueIndices[name];
			const indexKey = this.schema.indexKey(name, primary);

            // Use a MULTI wrapper to ensure the removal indexes happens atomically
			const multi = this.redisConnection.multi();

            // Queue up the removal of the primary key index removals
			records.forEach((item) =>
            {
				const recordKey = this.schema.recordKey(name, primary, item[primary]);
				multi.srem(indexKey, Utils.Sanitize(recordKey));
			});

            // Queue up index operations, removes any unique index values
			_.forEach(indices, idx =>
            {
				const name = idx.name;
				const key = idx.keyName;
                // Remove the previously indexed values
				records.forEach(record =>
                {
					multi.srem(key, record[name]);
				});
			});
			yield multi.exec();

			const promiseArr = [];
            // Queue up the removal of the primary key index removals
			records.forEach((item) =>
            {
				const recordKey = this.schema.recordKey(name, primary, item[primary]);
				promiseArr.push(this.redisConnection.del(recordKey));
			});
			yield promiseArr;
			return records;
		}
		catch (err)
        {
			throw err;
		}
	}

	*uniqueConstraint(collectionName, data)
    {

        // Grab the indices for this collection
		const indices = this.schema.uniqueIndices[collectionName];

        // If there are no indices for this collection, return true
		if (indices.length === 0) return true;

        // Create a MULTI wrapper for this connection
		const multi = this.redisConnection.multi();

        // For each sequence, add an query to check if the index exists
		indices.forEach(idx =>
        {
            // If no value is set, ignore it
			if (!_.has(data, idx.name)) return;
			multi.sismember(idx.keyName, data[idx.name]);
		});

        // Run the MULTI wrapped transaction checking that the results are all falsy
		try
        {
			let results = yield multi.exec();
			let unique = true;
			results = results || [];
            // For each of the results, if any are truthy then the value is not unique
			results.forEach(res =>
			{
                /**
                 * Each res from ioredis is an array in the below format:
                 *  [ err, value ]
                 *  So we need to check index 1 in the array for a value instead
                 */
				if (res[1]) unique = false;
			});

            // If unique is false return an error
			if (!unique) throw new Error(Errors.adapter.NotUnique);

			const promiseArr = [];
            // For each sequence, add an query to check if the index exists
			indices.forEach(idx =>
            {
                // If value is set, ignore it
				if (_.has(data, idx.name))
                {
					promiseArr.push(co(idx.index(data[idx.name]))
						.catch(err => {throw err;}));
				}
			});
			yield promiseArr;
			return true;
		}
		catch (err)
        {
			throw err;
		}
	}
}

module.exports = Index;