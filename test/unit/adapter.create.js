/**
 * Test dependencies
 */

let assert = require('assert'),
	co = require('co'),
	Adapter = require('../../'),
	Support = require('../support')(Adapter),
	Errors = require('../../lib/Errors').adapter;

/**
 * Raw waterline-redis `.create()` tests
 */

describe('adapter `.create()`', function()
{

	describe('with numeric id', function()
{
		before(function(done)
{
			const definition = {
				id : {
					type       : 'integer',
					primaryKey : true
				},
				name : {
					type : 'string'
				}
			};

			Support.Setup('create', 'numeric', definition, done);
		});

		after(function(done)
{
			Support.Teardown('create', 'numeric', done);
		});

		it('should properly create a new record', (done) =>
    {
			const attributes = {
				id   : 1,
				name : 'Darth Vader'
			};

			co(Adapter.Create('create', 'numeric', attributes))
          .then(model =>
          {
	assert(model.id === 1);
	assert(model.name === 'Darth Vader');
	done();
})
          .catch(err =>
          {
	throw err;
});
		});
	});

	describe('with primary string key', function()
{
		before(function(done)
{
			const definition = {
				email : {
					type       : 'string',
					primaryKey : true
				},
				name : {
					type : 'string'
				}
			};

			Support.Setup('create', 'string', definition, done);
		});

		after(function(done)
{
			Support.Teardown('create', 'string', done);
		});

		it('should properly create a new record', function(done)
{
			const attributes = {
				name  : 'Han Solo',
				email : 'han.solo@yahoo.com'
			};

			co(Adapter.Create('create', 'string', attributes))
            .then(model =>
            {
	assert(model.name === 'Han Solo');
	assert(model.email === 'han.solo@yahoo.com');
	done();
})
            .catch(err =>
            {
	throw err;
});
		});

		it('should return error on non-auto incrementing primary key', function(done)
{
			co(Adapter.Create('create', 'string', {name: 'Luke Skywalker'}))
            .then(model =>
            {
	done();
})
            .catch(err =>
            {
	assert(err);
	assert(err.message === Errors.PrimaryKeyMissing);
	done();
});
		});
	});

	describe('with unique attributes', function()
{
		before(function(done)
{
			const definition = {
				id : {
					type       : 'integer',
					primaryKey : true
				},
				email : {
					type   : 'string',
					unique : true
				}
			};

			Support.Setup('create', 'unique', definition, done);
		});

		after(function(done)
{
			Support.Teardown('create', 'unique', done);
		});

		it('should not create record with non-unique attributes', function(done)
{
			const attributes = {
				id    : 1,
				email : 'darth@hotmail.com'
			};

			co(Adapter.Create('create', 'unique', attributes))
            .then(model =>
            {
	co(Adapter.Create('create', 'unique', attributes))
                    .then(model =>
                    {
	done();
})
                    .catch(err =>
                    {
	assert(err);
	assert(err.message === Errors.NotUnique);
	done();
});
})
            .catch(err =>
            {
	throw err;
});
		});

		it('should create record with unique attributes', function(done)
    {
			co(Adapter.Create('create', 'unique', {id: 2, email: 'han@hotmail.com'}))
            .then(model =>
            {
	assert(model);
	assert(model.id === 2);
	assert(model.email === 'han@hotmail.com');
	co(Adapter.Create('create', 'unique', {id: 3, email: 'luke@hotmail.com'}))
                    .then(model =>
                    {
	assert(model);
	assert(model.id === 3);
	assert(model.email === 'luke@hotmail.com');
	done();
})
                    .catch(err =>
                    {
	throw err;
});
})
            .catch(err =>
            {
	throw err;
});
		});
	});

	describe('with auto incrementing attributes', function()
{
		before(function(done)
{
			const definition = {
				id : {
					type          : 'integer',
					primaryKey    : true,
					autoIncrement : true
				},
				age : {
					type          : 'integer',
					autoIncrement : true
				},
				number : {
					type          : 'integer',
					autoIncrement : true
				}
			};

			Support.Setup('create', 'auto', definition, done);
		});

		after(function(done)
{
			Support.Teardown('create', 'auto', done);
		});

		it('should create record with auto increments', function(done)
{

			co(Adapter.Create('create', 'auto', {}))
            .then(model =>
            {
	assert(model);
	assert(model.id === 1);
	assert(model.age === 1);
	assert(model.number === 1);
	done();
})
            .catch(err =>
            {
	throw err;
});
		});
	});

});
