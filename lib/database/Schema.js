/**
 * Created by frank on 16-11-22.
 */

const cloneDeep = require('lodash.clonedeep'),
	utils = require('../Utils'),
	Sequence = require('./Sequence'),
	UniqueIndex = require('./UniqueIndex');

class Schema
{
	constructor(redisConnection)
    {
        // Hold the schema for each collection
		this.schema = {};

        // Holds unique indexes for each collection
		this.uniqueIndices = {};

        // 关键key Holds the "primary key" attribute for each collection
		this.primary = {};

        // Holds any autoIncrementing sequences for each collection
		this.sequences = {};

        // Save the connection
		this.redisConnection = redisConnection;
	}

    /**
     * Register the given `schema` for a collection
     *
     * @param {String} collectionName
     * @param {Object} schema
     * @api public
     */
	registerCollection(collectionName, schema)
    {
		const name = collectionName.toLowerCase();

		schema = schema ? cloneDeep(schema) : {};

		this.schema[name] = schema;
		this.uniqueIndices[name] = [];
		this.sequences[name] = [];

		for (const [key, value] of Object.entries(schema))
        {
			if (value.hasOwnProperty('primaryKey'))
				this.primary[name] = key;
            // Create an index for the attribute
			if (value.hasOwnProperty('unique'))
			{
				const uniqueIndex = new UniqueIndex(name, key, this.redisConnection);
				this.uniqueIndices[name].push(uniqueIndex);
			}

            // Create a sequence for the attribute
			if (value.hasOwnProperty('autoIncrement'))
			{
				const sequence = new Sequence(name, key, this.redisConnection);
				this.sequences[name].push(sequence);
			}
		}
	}

    /**
     * Sync the schema to the database
     *
     * @api public
     */
	async sync()
    {
        // If no sequences were detected, just return
		if (utils.size(this.sequences) === 0) return;

        // If any sequences were found, sync them with redis
		let sequencesToSync = [];
		const promiseArr = [];
		for (const sequence of Object.values(this.sequences))
        {
			sequencesToSync = sequencesToSync.concat(sequence);
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
		return Object.assign({}, this.schema[name]);
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
		return this.primary[name];
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
		const name = collectionName.toLowerCase();

		if (!this.schema[name]) return values;

		for (const [key, value] of Object.entries(values))
        {
			if (!this.schema[name][key]) return;
			switch (this.schema[name][key].type)
            {
				case 'date':
				case 'time':
				case 'datetime':
					values[key] = new Date(value);
					break;
			}
		}
		return values;
	}

}

module.exports = Schema;