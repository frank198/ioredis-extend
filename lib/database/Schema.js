/**
 * Created by frank on 16-11-22.
 */

const cloneDeep = require('lodash.clonedeep'),
	utils = require('../Utils'),
	Sequence = require('./Sequence'),
	UniqueIndex = require('./UniqueIndex');

const uniqueIndices = Symbol('uniqueIndices'),
	schema = Symbol('schema'),
	primary = Symbol('primary'),
	sequences = Symbol('sequences');

class Schema
{
	constructor(redisConnection)
    {
        // Hold the schema for each collection
		this[schema] = new Map();

        // Holds unique indexes for each collection
		this[uniqueIndices] = new Map();

        // 关键key Holds the "primary key" attribute for each collection
		this[primary] = new Map();

        // Holds any autoIncrementing sequences for each collection
		this[sequences] = new Map();

        // Save the connection
		this.redisConnection = redisConnection;
	}

    /**
     * Register the given `schema` for a collection
     *
     * @param {String} collectionName
     * @param {Object} schemaValue
     * @api public
     */
	registerCollection(collectionName, schemaValue)
    {
		const name = collectionName.toLowerCase();

	    schemaValue = schemaValue ? cloneDeep(schemaValue) : {};

		this[schema].set(name, schemaValue);
	    // this.schema[name] = schema;
	    let uniqueIndicesSet = new Set();
		if (!this[uniqueIndices].has(name))
			this[uniqueIndices].set(name, uniqueIndicesSet);
		else
			uniqueIndicesSet = this[uniqueIndices].get(name);
		// this.uniqueIndices[name] = [];

	    let sequencesSet = new Set();
	    if (!this[sequences].has(name))
		    this[sequences].set(name, sequencesSet);
	    else
		    sequencesSet = this[sequences].get(name);

		for (const key of Object.keys(schemaValue))
		{
			const value = schemaValue[key];
			if (value.hasOwnProperty('primaryKey'))
				this[primary].set(name, key);
		        // Create an index for the attribute
			if (value.hasOwnProperty('unique'))
			{
				const uniqueIndex = new UniqueIndex(name, key, this.redisConnection);
				uniqueIndicesSet.add(uniqueIndex);
				// this.uniqueIndices[name].push(uniqueIndex);
			}

		        // Create a sequence for the attribute
			if (value.hasOwnProperty('autoIncrement'))
			{
				const sequence = new Sequence(name, key, this.redisConnection);
				sequencesSet.add(sequence);
			}
		}
	}

	uniqueIndicesValue(collectionName)
	{
		const name = collectionName.toLowerCase();
		if (this[uniqueIndices].has(name))
			return this[uniqueIndices].get(name);
		return new Set();
	}

    /**
     * Sync the schema to the database
     *
     * @api public
     */
	async sync()
    {
        // If no sequences were detected, just return
		if (this[sequences].size === 0) return;

        // If any sequences were found, sync them with redis
		let sequencesToSync = [];
		const promiseArr = [];
		for (const value of this[sequences].values())
        {
			sequencesToSync = sequencesToSync.concat([...value]);
		}
	    sequencesToSync = [...new Set(sequencesToSync)];
		sequencesToSync.forEach(sequence =>
		{
		    promiseArr.push(sequence.initialize());
		});
		if (promiseArr.length > 0)
			await Promise.all(promiseArr);
	}

    /**
     * Return a clone of the previously registered schema
     * for `collection`
     *
     * @param {String} collectionName
     * @api public
     */
	retrieve(collectionName)
    {
		const name = collectionName.toLowerCase();
		if (this[schema].has(name))
			return Object.assign({}, this[schema].get(name));
		return {};
		// return Object.assign({}, this.schema[name]);
	}

	resetSchema(collectionName)
	{
		const name = collectionName.toLowerCase();
		if (this[schema].has(name))
			this[schema].set(name, {});
	}

    /**
     * Return the key name for an index
     *
     * @param {String} collectionName
     * @param {Number|String} index optional
     * @api public
     */
	indexKey(collectionName, index)
    {
		const name = collectionName.toLowerCase();
		return `${utils.Prefix}:{${name}}:${index}`;
	}

    /**
     * Return the key name for a record
     *
     * @param {String} collectionName
     * @param {String} index
     * @param {String} key
     * @api public
     */
	recordKey(collectionName, index, key)
    {
		const name = collectionName.toLowerCase();
		const keyName = typeof key === 'string' ? key.replace(/\s/gi, '_') : key;
		return `${utils.Prefix}:{${name}}:${index}:${keyName}`;
	}

	primaryKey(collectionName)
	{
		const name = collectionName.toLowerCase();
		return this[primary].get(name);
	}

	sequencesValue(collectionName)
	{
		const name = collectionName.toLowerCase();
		return this[sequences].get(name);
	}

    /**
     * Parse and cast data for `collection` based on schema.
     *
     * @param {String} collectionName
     * @param {Object} values
     * @return {Object}
     */
	parse(collectionName, values)
    {
		if (utils.isNil(values)) return values;
		const name = collectionName.toLowerCase();

		if (!this[schema].has(name)) return values;

		const schemaObject = this[schema].get(name);
		for (const key of Object.keys(values))
        {
			if (!schemaObject[key]) continue;
			switch (schemaObject[key].type)
            {
				case 'date':
				case 'time':
				case 'datetime':
					values[key] = new Date(values[key]);
					break;
			}
		}
		return values;
	}

}

module.exports = Schema;