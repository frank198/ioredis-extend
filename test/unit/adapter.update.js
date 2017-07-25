/**
 * Test dependencies
 */

const assert = require('assert'),
	Adapter = require('../../'),
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
				Adapter.Create('update', 'update', {name: 'Walter'})
					.then(result =>
					{
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
			Adapter.DeleteKeys('update', 'update', {id: 1}, [name])
				.then(model =>
				{
					assert(model[0].id === 1);
					assert(model[0].name === 'Walter');
					done();
				});
		});

		it('update name', function(done)
		{
			Adapter.Update('update', 'update', {id: 1}, {name: 'frank'})
				.then(model =>
				{
					assert(model[0].id === 1);
					assert(model[0].name === 'frank');
					done();
				})
				.catch(err =>
				{
					assert(err.message === Errors.NotUnique);
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
				const coArr = [
					Adapter.Create('update', 'update', {name: 'The Dude', number: null}),
					Adapter.Create('update', 'update', {name: 'Donny', number: 3})
				];
				Promise.all(coArr)
					.then(result =>
					{
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
			Adapter.Update('update', 'update', {where: {name: 'The Dude'}}, {number: 3})
				.then(model =>
				{
					console.info(model);
				})
				.catch(err =>
				{
					assert(err.message === Errors.NotUnique);
					done();
				});
		});
	});
});
