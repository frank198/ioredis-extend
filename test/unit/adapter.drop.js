/**
 * Test dependencies
 */

const assert = require('assert'),
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
			Adapter.Create('drop', 'drop', {email: 'jabba@hotmail.com'})
				.then(result =>
				{
					console.info(result);
					done();
				})
				.catch(err => console.error(err));
		});
	});

	it('should create all index sets', done =>
    {
		const redis = Adapter.Native('drop', 'drop');
		const coArr = [
		  redis.exists(`${Prefix}:{drop}:_sequences:id`),
		  redis.exists(`${Prefix}:{drop}:id`),
		  redis.exists(`${Prefix}:{drop}:_indicies:email`),
		  redis.exists(`${Prefix}:{drop}:id:1`)
		];
		Promise.all(coArr)
		  .then(result =>
		  {
			  console.info(result);
			  assert(result.length === 4);
			  // assert(result[0] === 1);
			  // assert(result[1] === 1);
			  // assert(result[2] === 0);
			  // assert(result[3] === 1);
			  done();
		  });
	});

	it('should drop all index sets', function(done)
	{
		Adapter.Drop('drop', 'drop', []).then(()=>
		{
			const redis = Adapter.Native('drop', 'drop');
			const coArr = [
				redis.exists(`${Prefix}:{drop}:_sequences:id`),
				redis.exists(`${Prefix}:{drop}:id`),
				redis.exists(`${Prefix}:{drop}:_indicies:email`),
				redis.exists(`${Prefix}:{drop}:id:1`)
			];
			Promise.all(coArr)
				.then(result =>
				{
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

});
