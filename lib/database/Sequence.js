/**
 * Created by frank on 16-11-22.
 *  Sequences represent auto-incrementing values. They are responsible for
 * tracking the last value available and can be incremented only.
 *
 */
const utils = require('../Utils');

class Sequence
{
	constructor(collectionName, name, redisConnection)
    {
        // Cache the client connection
		this.redisConnection = redisConnection;

        // Set the name of the sequence
		this.name = utils.Sanitize(name);

        // Build a NoSQL Key name for this sequence
		this.keyName = `${utils.Prefix}:{${collectionName.toLowerCase()}}:_sequences:${this.name}`;
	}

    /**
     * Ensures a sequence exists and if not will create one and set the initial
     * value to zero.
     * @api private
     */
	async initialize()
    {
		try
        {
			const sequence = await this.redisConnection.get(this.keyName);
			if (sequence) return null;
			return await this.redisConnection.set(this.keyName, 0);
		}
		catch (err)
        {
			return err;
		}
	}

    /**
     * Get the current value of a sequence
     *
     * @api public
     */
	async get()
    {
		return await this.redisConnection.get(this.keyName);
	}

    /**
     * Increment the value of a sequence
     *
     * @api public
     */
	async increment()
    {
		return await this.redisConnection.incr(this.keyName);
	}

    /**
     * Set A Sequence to a certain value
     *
     * @param {Integer} val
     * @api public
     */
	async set(val)
    {
		return await this.redisConnection.set(this.keyName, val);
	}
}

module.exports = Sequence;