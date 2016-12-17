/**
 * Created by frank on 16-11-22.
 */

const _ = require('lodash'),
	Utils = require('../Utils'),
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
     * @param {Object} config
     * @param {Function} callback
     * @api public
     */
	registerCollection(collectionName, schema)
    {
		const name = collectionName.toLowerCase();

		schema = schema ? _.cloneDeep(schema) : {};

		this.schema[name] = schema;
		this.uniqueIndices[name] = [];
		this.sequences[name] = [];

		_.forEach(schema, (value, key) =>
        {
			if (_.has(value, 'primaryKey'))
				this.primary[name] = key;
            // Create an index for the attribute
			if (_.has(value, 'unique'))
			{
				const uniqueIndex = new UniqueIndex(name, key, this.redisConnection);
				this.uniqueIndices[name].push(uniqueIndex);
			}

            // Create a sequence for the attribute
			if (_.has(value, 'autoIncrement'))
			{
				const sequence = new Sequence(name, key, this.redisConnection);
				this.sequences[name].push(sequence);
			}
		});
	}

    /**
     * Sync the schema to the database
     *
     * @api public
     */
	*sync()
    {
        // If no sequences were detected, just return
		if (_.size(this.sequences) === 0) return;

        // If any sequences were found, sync them with redis
		let sequencesToSync = [];
		const promiseArr = [];
		_.forEach(this.sequences, (sequence, collection) =>
        {
			sequencesToSync = sequencesToSync.concat(sequence);
		});

		_.forEach(sequencesToSync, sequence =>
        {
			promiseArr.push(sequence.initialize());
		});
		yield promiseArr;
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
		return _.clone(this.schema[name]);
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
		return `${Utils.Prefix}:{${name}}:${index}`;
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
		const keyName = _.isString(key) ? key.replace(/\s/gi, '_') : key;
		return `${Utils.Prefix}:{${name}}:${index}:${keyName}`;
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

		_.forEach(values, (value, key) =>
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
		});

		return values;
	}

}

module.exports = Schema;