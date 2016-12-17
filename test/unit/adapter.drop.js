/**
 * Test dependencies
 */

let assert = require('assert'),
	co = require('co'),
	Adapter = require('../../'),
	Prefix = require('../../lib/Utils').Prefix,
	Support = require('../support')(Adapter);

/**
 * Raw waterline-redis `.drop()` tests
 */

describe('adapter `.drop()`', function()
{
	before(function(done)
{
		const definition = {
			id : {
				type          : 'integer',
				primaryKey    : true,
				autoIncrement : true
			},
			email : {
				type   : 'string',
				unique : true
			}
		};

		Support.Setup('drop', 'drop', definition, function(err)
{
			if (err) throw err;

			co(function *()
        {
				try
          {
					const coArr = [
						co(Adapter.Create('drop', 'drop', {email: 'jabba@hotmail.com'}))
					];
					const result = yield coArr;
					console.info(result);
					done();
				}
				catch (err)
          {
					done();
				}

			});
		});
	});

	it('should create all index sets', done =>
  {
		co(function *()
      {
			const redis = Adapter.Native('drop', 'drop');
			const coArr = [
				co(redis.exists(`${Prefix}:{drop}:_sequences:id`)),
				co(redis.exists(`${Prefix}:{drop}:id`)),
				co(redis.exists(`${Prefix}:{drop}:_indicies:email`)),
				co(redis.exists(`${Prefix}:{drop}:id:1`))
			];
			const result = yield coArr;
			console.info(result);
			assert(result.length === 4);
			assert(result[0] === 1);
			assert(result[1] === 1);
			assert(result[2] === 1);
			assert(result[3] === 1);
			done();

		});
	});

	it('should drop all index sets', function(done)
  {
		co(function *()
      {
			yield Adapter.Drop('drop', 'drop', []);
			const redis = Adapter.Native('drop', 'drop');
			const coArr = [
				co(redis.exists(`${Prefix}:{drop}:_sequences:id`)),
				co(redis.exists(`${Prefix}:{drop}:id`)),
				co(redis.exists(`${Prefix}:{drop}:_indicies:email`)),
				co(redis.exists(`${Prefix}:{drop}:id:1`))
			];
			const result = yield coArr;
			console.info(result);
			assert(result.length === 4);
			assert(result[0] === 0);
			assert(result[1] === 0);
			assert(result[2] === 0);
			assert(result[3] === 0);
			done();
		});
	});

});
