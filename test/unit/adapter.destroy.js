/**
 * Test dependencies
 */

let async = require('async'),
	assert = require('assert'),
	co = require('co'),
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
				co(function *()
        {
					const m = yield Adapter.Create('destroy', 'destroy', {email: 'jaba@hotmail.com', name: 'Jaba the hut'});
					model = m;
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
			co(Adapter.Destroy('destroy', 'destroy', {id: model.id}))
            .then(result =>
            {
	co(Adapter.Find('destroy', 'destroy', {id: model.id}))
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

				co(function *()
        {
					const promiseArr = [];
					[1, 2, 3, 4].forEach(value =>
            {
						promiseArr.push(co(Adapter.Create('destroy', 'destroy', {email: i, name: `User${value}`})));
					});
					const result = yield promiseArr;
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
			co(Adapter.Destroy('destroy', 'destroy', {where: {name: 'User1'}}))
            .then(status =>
            {
	co(Adapter.Find('destroy', 'destroy', {where: {name: 'User2'}}))
                    .then(models =>
                    {
	assert(!models.length);
	assert(models.length === 0);
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
