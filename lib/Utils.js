/**
 * Created by frank on 16-11-22.
 */

const _ = require('lodash');

let PREFIX = 'gameMirror';
class Utils
{

    /**
     * Serialize the configuration object
     * @param {Object} config collection
     * @returns {{port, host: (*|host|{cmd, hostname}|string|string), options: (*|HTMLOptionsCollection|Object), password: (*|null|string)}}
     * @constructor
     */
	static SerializeConfig(config)
    {
		return {
			port     : config.port,
			host     : config.host,
			options  : config.options,
			password : config.password
		};
	}

    /**
     * Sanitize a key removing any spaces or reserved charaters
     *
     * @param {String} str
     */
	static Sanitize(str)
    {
		return _.isString(str) ? _.replace(str, /\s+/g, '_') : str;
	}

	static get Prefix()
    {
		return PREFIX;
	}

	static set Prefix(value)
    {
		PREFIX = value;
	}

}

module.exports = Utils;