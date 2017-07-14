/**
 * Test dependencies
 */

const assert = require('assert'),
	Adapter = require('../../'),
	Support = require('../support')(Adapter),
	Errors = require('../../lib/Errors').adapter;

/**
 * Raw waterline-redis `.destroy()` tests
 */

describe('adapter `.destroy()`', function()
{

	describe('with explicit id', function()
	{
		let model;

		before(function(done)
		{
			const definition = {
				id : {
					type          : 'integer',
					primaryKey    : true,
					autoIncrement : true
				},
				email : {
					type : 'string'
				},
				name : {
					type : 'string'
				}
			};

			Support.Setup('destroy', 'destroy', definition, function(err)
			{
				if (err) throw err;
				Adapter.Create('destroy', 'destroy', {
					email : 'jaba@hotmail.com',
					name  : 'Jaba the hut'})
					.then(result =>
					{
						model = result;
						done();
					});

			});
		});

		after(function(done)
		{
			Support.Teardown('destroy', 'destroy', done);
		});

		it('should delete a record', done =>
        {
			Adapter.Destroy('destroy', 'destroy', {id: model.id})
				.then(result =>
                {
					Adapter.Find('destroy', 'destroy', {id: model.id})
						.then(models =>
						{
							assert(models.length === 0);
							done();
						})
						.catch(err =>
						{
							assert(!err);
							done();
						});
				})
				.catch(err =>
                {
					assert(!err);
				});
		});
	});

	describe('with multiple records', function()
	{
		before(function(done)
		{
			let i, len;

			const definition = {
				id : {
					type          : 'integer',
					primaryKey    : true,
					autoIncrement : true
				},
				email : {
					type : 'string'
				},
				name : {
					type : 'string'
				}
			};

			Support.Setup('destroy', 'destroy', definition, function(err)
			{
				if (err) throw err;
				const promiseArr = [];
				[1, 2, 3, 4].forEach(value =>
				{
					promiseArr.push(Adapter.Create('destroy', 'destroy', {
						email : i,
						name  : `User${value}`}));
				});
				Promise.all(promiseArr)
					.then(result =>
					{
						console.info(result);
						done();
					});

			});
		});

		after(function(done)
		{
			Support.Teardown('destroy', 'destroy', done);
		});

		it('should delete all records', (done) =>
        {
			Adapter.Destroy('destroy', 'destroy', {where: {name: 'User1'}})
				.then(status =>
	            {
					Adapter.Find('destroy', 'destroy', {where: {name: 'User1'}})
						.then(models =>
						{
							assert(models.length <= 0);
							done();
						})
						.catch(err =>
						{
							assert(!err);
							done();
						});
				})
                .catch(err => {throw err;});
		});
	});

});
