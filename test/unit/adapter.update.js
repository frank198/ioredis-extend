/**
 * Test dependencies
 */

let assert = require('assert'),
	Adapter = require('../../'),
	co = require('co'),
	Support = require('../support')(Adapter),
	Errors = require('../../lib/Errors').adapter;

/**
 * Raw waterline-redis `.update()` tests
 */

describe('adapter `.update()`', function()
{

	describe('with simple attributes', function()
	{
		before(function(done)
		{
			const definition = {
				id : {
					type          : 'integer',
					primaryKey    : true,
					autoIncrement : true
				},
				name : {
					type : 'string'
				}
			};

			Support.Setup('update', 'update', definition, function(err)
			{
				if (err) throw err;
				co(function *()
				{
					const coArr = [
						co(Adapter.Create('update', 'update', {name: 'Walter'}))
					];
					const result = yield coArr;
					console.info(result);
					done();
				});
			});
		});

		after(function(done)
		{
			Support.Teardown('update', 'update', done);
		});

		it('should properly update attributes', function(done)
		{
			co(function *()
			{
				const model = yield Adapter.DeleteKeys('update', 'update', {id: 1}, ['name']);
				assert(model[0].id === 1);
				assert(model[0].name === 'Sobchak');
				done();
			});
		});
	});

	describe('with a complex case', function()
	{
		before(function(done)
		{
			const definition = {
				id : {
					type          : 'integer',
					primaryKey    : true,
					autoIncrement : true
				},
				name : {
					type   : 'string',
					unique : true
				},
				number : {
					type   : 'integer',
					unique : true
				}
			};

			Support.Setup('update', 'update', definition, function(err)
			{
				if (err) throw err;

				co(function *()
				{
					const coArr = [
						co(Adapter.Create('update', 'update', {name: 'The Dude', number: null})),
						co(Adapter.Create('update', 'update', {name: 'Donny', number: 3})),
					];
					const result = yield coArr;
					console.info(result);
					done();
				});
			});
		});

		after(function(done)
		{
			Support.Teardown('update', 'update', done);
		});

		it('should check for unique values', function(done)
		{
			co(function *()
        {
				try
            {
					const model = yield Adapter.Update('update', 'update', {where: {name: 'The Dude'}}, {number: 3});
					console.info(model);
				}
				catch (err)
            {
					assert(err.message === Errors.NotUnique);
					done();
				}
			});
		});
	});
});
