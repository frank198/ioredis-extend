/**
 * Created by frank on 16-11-21.
 */
const Redis = require('ioredis'),
	_ = require('lodash');

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
		const hosts = _.get(config, 'hosts', []);
		const password = _.get(config, 'password', null);
		const database = _.get(config, 'database', null);
		let client = null;
        // if we have hosts then assume it's a cluster
		if (_.size(hosts) > 0)
        {
			client = new Redis.Cluster(hosts, config);
		}
		else
        {
			client = new Redis(config);
		}

		if (!_.isNil(password))
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
			if (_.size(hosts) <= 0 && !_.isNil(database))
            {
				client.select(database);
			}
		});
		return client;
	}
}

module.exports = Connection;