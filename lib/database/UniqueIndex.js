/**
 *  Handles creating an "index" in Redis. This is really just a set made up of unique
 * values that can be checked against to determine if a value is unique or not.
 *
 * Created by frank on 16-11-22.
 */

const utils = require('../Utils'),
	Errors = require('../Errors');

class UniqueIndex
{
	constructor(collectionName, name, redisConnection)
    {
        // Cache the client connection
		this.redisConnection = redisConnection;

        // Set the name of the sequence
		this.name = utils.Sanitize(name);

        // Build a NoSQL Key name for this sequence
		this.keyName = `${utils.Prefix}:{${collectionName.toLowerCase()}}:_indices:${this.name}`;
	}

    /**
     * Create an index if one doesn't exist or return an error if the
     * value is already indexed.
     *
     * @param {String} value
     */
	async index(value)
    {
	    const indexed = await this.redisConnection.sismember(this.keyName, value);
	    if (indexed) return new Error(Errors.adapter.NotUnique);
	    return await this.redisConnection.sadd(this.keyName, value);
	}

}

module.exports = UniqueIndex;