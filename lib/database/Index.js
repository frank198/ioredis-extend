'use strict';

const Schema = require('./Schema'),
	map = require('lodash.map'),
	cloneDeep = require('lodash.clonedeep'),
	pick = require('lodash.pick'),
	omit = require('lodash.omit'),
	WaterlineCriteria = require('waterline-criteria-test'),
	utils = require('../Utils'),
	intersection = utils.intersection,
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
	async sync()
    {
		return await this.schema.sync();
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
		if (utils.isEmpty(desc)) desc = null;

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
     * @api public
     */
	async drop(collectionName)
    {
		const name = collectionName.toLowerCase();

        // Cache key values 获取 schema 缓存中的值
		const primary = this.schema.primary[name],
			sequences = this.schema.sequences[name],
			indices = this.schema.uniqueIndices[name];

		const index = this.schema.indexKey(name, primary);

		const schemas = sequences.concat(indices);
		let keys = map(schemas, 'keyName');
        // Add the main primary key index to the keys array
		keys.push(index);

		try
        {
			const values = await this.redisConnection.smembers(index);
            // Add the member keys onto the keys array
			keys = keys.concat(values);
			const promiseArr = [];
			keys.forEach(key =>
			{
				promiseArr.push(this.redisConnection.del(key));
			});
			await Promise.all(promiseArr);
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
	async find(collectionName, criteria)
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
            !Array.isArray(criteria.where[primary]) &&
            ![null, undefined].includes(criteria.where[primary]) && !utils.size(criteria.where) === 1)
        {
			recordKey = this.schema.recordKey(name, primary, criteria.where[primary]);
			try
            {
				let record = await this.redisConnection.get(recordKey);
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
		if (criteria.hasOwnProperty('skip'))
        {
			options.skip = cloneDeep(criteria.skip);
			delete criteria.skip;
		}

		if (criteria.hasOwnProperty('limit'))
        {
			options.limit = cloneDeep(criteria.limit);
			delete criteria.limit;
		}

		if (criteria.hasOwnProperty('sort'))
        {
			options.sort = cloneDeep(criteria.sort);
			delete criteria.sort;
		}
		else
        {
            // Sort by primaryKey asc
			options.sort = {};
			options.sort[primary] = 1;
		}

	    // Get all the record keys belonging to this collection
	    const members = await this.redisConnection.smembers(indexKey);
	    let models = [];
	    const promiseArr = [];
	    members.forEach(member =>
	    {
		    const promiseItem = this.redisConnection.get(member)
			    .then(result =>
			    {
				    if (!result) return;
				    result = JSON.parse(result);
				    // Cast Result Data
				    result = this.schema.parse(name, result);

				    // Build up a dataset for use with waterline-criteria
				    const data = {};
				    data[name] = [result];
				    // Check for match using waterline-criteria
				    const resultSet = WaterlineCriteria(name, data, criteria);
				    models = models.concat(resultSet.results);
			    })
			    .catch(err => {throw err;});
		    promiseArr.push(promiseItem);
	    });
	    await Promise.all(promiseArr);
	    let resultSet = [];
	    // If any processing options were supplied, re-run Waterline-Criteria with the filtered
	    // results set. This will process any sorting and pagination options.
	    if (options.hasOwnProperty('sort') || options.hasOwnProperty('limit') || options.hasOwnProperty('skip'))
	    {
		    // Build up a dataset for use with waterline-criteria
		    const data = {};
		    data[name] = models;

		    options.where = {};
		    resultSet = WaterlineCriteria(name, data, options).results || [];
	    }

	    // Process Aggregate Options
	    const aggregate = new Aggregate(criteria, resultSet);

	    if (aggregate.error) return Promise.reject(aggregate.error);
	    return aggregate.result;
	}

	async get(collectionName, primaryKey, field)
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
		const record = await this.find(collectionName, criteria);
		if (record.length === 1)
		{
			if (record[0][primary] === primaryKey)
			{
				const singleRecord = record[0];
				return fields.length > 0 ? pick(singleRecord, fields) : singleRecord;
			}
			return null;
		}
		else if (record.length > 1)
		{
			throw new Error(`get record by ${primaryKey} result is ${record}`);
		}
		return null;
	}

	async keys(collectionName)
	{
		const name = collectionName.toLowerCase();
		// Find the attribute used as a primary key
		const primary = this.schema.primary[name];
		// Find the index key used to keep track of all the keys in this collections
		const indexKey = this.schema.indexKey(name, primary);
		// Get all the record keys belonging to this collection
		const members = await this.redisConnection.smembers(indexKey);
		return map(members, member => {return member.replace(indexKey, '');});
	}

	async hasKey(collectionName, primaryKey)
	{
		const name = collectionName.toLowerCase();
		// Find the attribute used as a primary key
		const primary = this.schema.primary[name];
		// Find the index key used to keep track of all the keys in this collections
		const indexKey = this.schema.indexKey(name, primary);
		const recordKey = this.schema.recordKey(collectionName, primary, primaryKey);
		const hasKey = await this.redisConnection.sismember(indexKey, recordKey);
		return hasKey === 1;
	}

    /**
     *  Create a new record from `data`
     *
     * @param {String} collectionName
     * @param {Object} data
     */
	async create(collectionName, data)
    {
		let name = collectionName.toLowerCase();
		const _data = cloneDeep(data),
			sequences = this.schema.sequences[name];

		name = typeof name === 'string' ? name.replace(/\s/gi, '_') : name;
	    await this.uniqueConstraint(name, data);
	    const sequenceNames = map(sequences, 'name');
	    // Add Auto-Generated Primary Key to indices
	    // Check if the primary key is a sequence
	    const primary = this.schema.primary[name];
	    if (utils.isNil(data[primary]) && !sequenceNames.includes(primary))
	    {
		    throw new Error(Errors.adapter.PrimaryKeyMissing);
	    }
	    const sequenceValues = {};
	    const promiseArr = [];
	    for (const item of sequences)
	    {
		    const itemName = item.name;
		    let coItem = null;
		    if (!utils.isNil(itemName))
		    {
			    if (data[itemName])
			    {
				    coItem = item.set(data[itemName])
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
				    coItem = item.increment()
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
	    }
	    if (promiseArr.length > 0)
	        await Promise.all(promiseArr);
	    // Grab the key to use for this record
	    let noSqlKey = this.schema.recordKey(name, primary, data[primary]);
	    noSqlKey = utils.Sanitize(noSqlKey);
	    // Stringify data for storage
	    const parsedData = JSON.stringify(data);
	    await this.redisConnection.set(noSqlKey, parsedData);
	    let values = await this.redisConnection.get(noSqlKey);
	    values = JSON.parse(values);
	    // Store autoPK flag
	    let autoPK = false;
		for (const sequence of sequences)
		{
			if (sequence.name === primary)
			{
				autoPK = true;
				break;
			}
		}
	    // If the primary key is not a sequence there is no need to index it.
	    // It would have been previously indexed in the unique constraint test
	    // If a value was supplied for an autoPK value, it will be indexed by the
	    // unique constraint test.
	    if (autoPK && !_data[primary])
	    {
		    const indices = this.schema.uniqueIndices[name];
		    indices.forEach(idx =>
		    {
			    if (idx.name === primary)
			    {
				    idx.index(utils.Sanitize(data[primary]));
			    }
		    });
	    }
	    // Add Primary Key to indexed set
	    const index = this.schema.indexKey(name, primary);
	    await this.redisConnection.sadd(index, noSqlKey);
	    return this.schema.parse(name, values);
	}

    /**
     * Update a record
     *
     * @param {String} collectionName
     * @param {Object} criteria
     * @param {Object} values
     * @api public
     */
	async update(collectionName, criteria, values)
    {
		const name = collectionName.toLowerCase(),
			primary = this.schema.primary[name];

        // Don't allow the updating of primary keys
		if (!utils.isNil(values[primary]) && values[primary] !== criteria.where[primary])
		{
			throw new Error(Errors.adapter.PrimaryKeyUpdate);
		}
        // Delete any primary keys
		delete values[primary];

	    // 检测自增 key
	    const sequences = this.schema.sequences[name];
	    let valid = true;
	    sequences.forEach(function(sequenceNames)
	    {
		    if (!utils.isNil(values[sequenceNames]))
		    {
			    valid = false;
		    }
	    });
	    if (!valid)
	    {
		    throw new Error(Errors.adapter.InvalidAutoIncrement);
	    }

	    const records = await this.find(name, criteria);
	    const updateKeys = Object.keys(values);
	    // 检测唯一 key
	    // Get Indices
	    const indices = this.schema.uniqueIndices[name];
	    const indexNames = map(indices, 'name');
	    const sameIndexNameArr = intersection(updateKeys, indexNames);
	    if (sameIndexNameArr.length > 0)
	    {
		    // Check if any unique values are being updated across multiple records
		    if (records.length > 1)
		    {
			    throw new Error('Attempting to update a unique value on multiple records');
		    }
		    await this.uniqueConstraint(name, values);
	    }

	    // Use a MULTI wrapper to ensure the removal and creation of indexes happens atomically
	    const multi = this.redisConnection.multi();

	    indices.forEach(idx =>
	    { // Queue up index operations
		    const name = idx.name;
		    const key = idx.keyName;

		    // Indexed value not updated
		    if (!utils.isNil(values[name]))
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
	    const multiResults = await multi.exec();
	    if (multiResults.indexOf(0) > -1) throw new Error('Error writing index');

	    const models = new Set();
	    const promiseArr = [];
	    records.forEach(record =>
	    {
		    const key = this.schema.recordKey(name, primary, record[primary]);
		    const updatedValues = Object.assign(record, values);
		    promiseArr.push(this.redisConnection.set(key, JSON.stringify(updatedValues))
				.then(result =>
				{
					if (result === 'ok')
				        models.add(updatedValues);
				})
				.catch(err => {throw err;})
		    );
	    });
	    await Promise.all(promiseArr);
	    return Array.from(models);
	}

	/**
	 *  删除指定集合的 key
	 * @param {String} collectionName
	 * @param {Object} criteria
	 * @param {String} key
	 */
	async deleteKeys(collectionName, criteria, ...key)
	{
		const keys = [].concat(key);
		const name = collectionName.toLowerCase(),
			primary = this.schema.primary[name];
		if (keys.includes(primary))
		{
			throw new Error('delete keys has primary Key');
		}
		const sequences = this.schema.sequences[name];
		const sequenceNames = map(sequences, 'name');
		const sameSequenceNameArr = intersection(keys, sequenceNames);
		if (sameSequenceNameArr.length > 0)
		{
			throw new Error(Errors.adapter.InvalidAutoIncrement);
		}
		const records = await this.find(name, criteria);

		// Get Indices
		const indices = this.schema.uniqueIndices[name];
		const indexNames = map(indices, 'name');
		const sameIndexNameArr = intersection(keys, indexNames);
		const models = [];
		const multi = this.redisConnection.multi();
		records.forEach(record =>
		{
			const key = this.schema.recordKey(name, primary, record[primary]);
			if (sameIndexNameArr.length > 0)
			{
				// Use a MULTI wrapper to ensure the removal and creation of indexes happens atomically
				sameIndexNameArr.forEach(idx =>
				{ // Queue up index operations
					const name = idx.name;
					const key = idx.keyName;
					multi.srem(key, record[name]);
				});
			}
			const newRecord = omit(record, keys);
			multi.set(key, JSON.stringify(newRecord));
			models.push(record);
		});
		const multiResults = await multi.exec();
		if (multiResults.indexOf(0) > -1) throw new Error('Error writing index');
		return models;
	}

    /**
     * Destory Record(s)
     *
     * @param {String} collectionName
     * @param {Object} criteria
     * @api public
     */
	async destroy(collectionName, criteria)
    {
		const name = collectionName.toLowerCase(),
			primary = this.schema.primary[name];

	    // Find all matching records based on the criteria
	    const records = await this.find(name, criteria);

	    // Get Indices
	    const indices = this.schema.uniqueIndices[name];
	    const indexKey = this.schema.indexKey(name, primary);

	    // Use a MULTI wrapper to ensure the removal indexes happens atomically
	    const multi = this.redisConnection.multi();

	    // Queue up the removal of the primary key index removals
	    records.forEach((item) =>
	    {
		    const recordKey = this.schema.recordKey(name, primary, item[primary]);
		    multi.srem(indexKey, utils.Sanitize(recordKey));
	    });

	    // Queue up index operations, removes any unique index values
	    indices.forEach(idx =>
	    {
		    const name = idx.name;
		    const key = idx.keyName;
		    // Remove the previously indexed values
		    records.forEach(record =>
		    {
			    multi.srem(key, record[name]);
		    });
	    });
	    await multi.exec();

	    const promiseArr = [];
	    // Queue up the removal of the primary key index removals
	    records.forEach((item) =>
	    {
		    const recordKey = this.schema.recordKey(name, primary, item[primary]);
		    promiseArr.push(this.redisConnection.del(recordKey));
	    });
	    await Promise.all(promiseArr);
	    return records;
	}

	async uniqueConstraint(collectionName, data)
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
			if (!data.hasOwnProperty(idx.name)) return;
			multi.sismember(idx.keyName, data[idx.name]);
		});

        // Run the MULTI wrapped transaction checking that the results are all falsy
	    let results = await multi.exec();
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
		    if (data.hasOwnProperty(idx.name))
		    {
			    promiseArr.push(idx.index(data[idx.name]));
		    }
	    });
	    await Promise.all(promiseArr);
	    return true;
	}
}

module.exports = Index;