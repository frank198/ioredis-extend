/**
 * Created by frank on 16-11-21.
 */
const Redis = require('ioredis'),
	utils = require('./Utils');

class Connection
{
	constructor(config)
    {
		this.config = config || {};
		this.redisConnection = this.connect();
	}

	connect()
    {
		const config = this.config;
		const hosts = config.hosts;
		const password = config.password;
		const database = config.database;
		let client = null;
        // if we have hosts then assume it's a cluster
		if (utils.size(hosts) > 0)
        {
			client = new Redis.Cluster(hosts, config);
		}
		else
        {
			client = new Redis(config);
		}

		if (!utils.isNil(password))
        {
			try
            {
				client.auth(password);
			}
			catch (err)
            {
				console.error(err.stack);
			}
		}

		client.once('ready', () =>
        {
			if (utils.size(hosts) <= 0 && !utils.isNil(database))
            {
				client.select(database);
			}
		});
		return client;
	}
}

module.exports = Connection;