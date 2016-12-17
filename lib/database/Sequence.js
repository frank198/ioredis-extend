/**
 * Created by frank on 16-11-22.
 *  Sequences represent auto-incrementing values. They are responsible for
 * tracking the last value available and can be incremented only.
 *
 */
const Utils = require('../Utils');

class Sequence
{
	constructor(collectionName, name, redisConnection)
    {
        // Cache the client connection
		this.redisConnection = redisConnection;

        // Set the name of the sequence
		this.name = Utils.Sanitize(name);

        // Build a NoSQL Key name for this sequence
		this.keyName = `${Utils.Prefix}:{${collectionName.toLowerCase()}}:_sequences:${this.name}`;
	}

    /**
     * Ensures a sequence exists and if not will create one and set the initial
     * value to zero.
     * @api private
     */
	*initialize()
    {
		try
        {
			const sequence = yield this.redisConnection.get(this.keyName);
			if (sequence) return null;
			return yield this.redisConnection.set(this.keyName, 0);
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
	*get()
    {
		return yield this.redisConnection.get(this.keyName);
	}

    /**
     * Increment the value of a sequence
     *
     * @api public
     */
	*increment()
    {
		return yield this.redisConnection.incr(this.keyName);
	}

    /**
     * Set A Sequence to a certain value
     *
     * @param {Integer} val
     * @api public
     */
	*set(val)
    {
		return yield this.redisConnection.set(this.keyName, val);
	}
}

module.exports = Sequence;