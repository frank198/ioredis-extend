/**
 * Created by frank on 16-11-22.
 */

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
		return typeof str === 'string' ? str.replace(/\s+/g, '_') : str;
	}

	static get Prefix()
    {
		return PREFIX;
	}

	static set Prefix(value)
    {
		PREFIX = value;
	}

	static isEmpty(value)
	{
		if (value === null || value === undefined) return true;
		const type = typeof value;
		if ((type === 'string' || Array.isArray(value)) && value.length <= 0) return true;
		if (type === 'object')
		{
			for (const t in value)
			{
				return false;
			}
			return true;
		}
		return false;
	}

	static size(value)
	{
		if (value === null || value === undefined) return 0;
		const type = typeof value;
		if (type === 'string' || Array.isArray(value))
			return value.length;
		if (type === 'object')
		{
			return Object.keys(value).length;
		}
		return 0;
	}

	static isNil(value)
	{
		return value === null || value === undefined;
	}

	static intersection(target, source)
	{
		if (!Array.isArray(target) || !Array.isArray(source)) return [];
		if (target.length <= 0 || source.length <= 0) return [];
		const intersectionSet = new Set();
		if (!(target instanceof Set))
			target = new Set(target);
		if (!(source instanceof Set))
			source = new Set(source);
		for (const x of target)
		{
			if (source.has(x))
			{
				intersectionSet.add(x);
			}
		}
		return [...intersectionSet];
	}

}

module.exports = Utils;