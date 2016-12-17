/**
 * Test dependencies
 */

let assert = require('assert'),
	co = require('co'),
	Adapter = require('../../'),
	Support = require('../support')(Adapter);

/**
 * Raw waterline-redis `.find()` tests
 */

describe('adapter `.find()`', function()
{
	before(function(done)
{
		const definition = {
			gId : {
				type          : 'integer',
				primaryKey    : true,
				autoIncrement : true
			},
			name : {
				type : 'string'
			},
			age : {
				type : 'integer'
			}
		};

		Support.Setup('finders', 'finders', definition, function(err)
    {
			co(function *()
        {
				const coArr = [
					co(Adapter.Create('finders', 'finders', {name: 'Steve Holt', age: 19})),
					co(Adapter.Create('finders', 'finders', {name: 'Annyong', age: 18}))
				];
				const result = yield coArr;
				console.info(result);
				done();
			});
		});
	});

	after(function(done)
{
		Support.Teardown('finders', 'finders', done);
	});

	describe('simple', function()
{
		it('should find using string `name`', done =>
    {
			co(function *()
        {
				const criteria = {where: {name: 'Steve Holt'}};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 1);
				assert(records[0].name === 'Steve Holt');
				done();
			});
		});

		it('should find using integer `age`', done =>
    {
			co(function *()
        {
				const criteria = {gId: 1, groupBy: ['age']};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 1);
				assert(records[0].age === 18);
				done();
			});
		});

		it('should return all records with empty criteria', done =>
    {
			co(function *()
        {
				const criteria = {};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 2);
				done();
			});
		});
	});

	describe('complex', function()
  {
		it('should properly return records using `startsWith`', done =>
    {
			co(function *()
        {
				const criteria = {where: {name: {startsWith: 'Anny'}}};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 1);
				assert(records[0].name === 'Annyong');
				done();
			});
		});

		it('should properly return records using `endsWith`', done =>
    {
			co(function *()
        {
				const criteria = {where: {name: {endsWith: 'Holt'}}};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 1);
				assert(records[0].name === 'Steve Holt');
				done();
			});
		});

		it('should properly return records using `like`', done =>
    {
			co(function *()
        {
				const criteria = {where: {like: {name: '%eve%'}}};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 1);
				assert(records[0].name === 'Steve Holt');
				done();
			});
		});

		it('should properly return records using `contains`', done =>
    {
			co(function *()
        {
				const criteria = {where: {name: {contains: 'nny'}}};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 1);
				assert(records[0].name === 'Annyong');
				done();
			});
		});

		it('should properly return records using `in` type query', done =>
    {
			co(function *()
        {
				const criteria = {where: {name: ['Steve Holt', 'Annyong']}};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 2);
				assert(records[0].name === 'Steve Holt');
				assert(records[1].name === 'Annyong');
				done();
			});
		});

		it('should properly return records using `lessThan`', done =>
    {
			co(function *()
        {
				const criteria = {where: {age: {lessThan: 19}}};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 1);
				assert(records[0].name === 'Annyong');
				done();
			});
		});

		it('should properly return records using `lessThanOrEqual`', done =>
    {
			co(function *()
        {
				const criteria = {where: {age: {lessThanOrEqual: 19}}};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 2);
				assert(records[0].name === 'Steve Holt');
				assert(records[1].name === 'Annyong');
				done();
			});
		});

		it('should properly return records using `greaterThan`', done =>
    {
			co(function *()
        {
				const criteria = {where: {age: {greaterThan: 18}}};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 1);
				assert(records[0].name === 'Steve Holt');
				assert(records[0].age === 19);
				done();
			});
		});

		it('should properly return records using `greaterThanOrEqual`', done =>
    {
			co(function *()
        {
				const criteria = {where: {age: {greaterThanOrEqual: 18}}};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 2);
				assert(records[0].name === 'Steve Holt');
				assert(records[1].name === 'Annyong');
				done();
			});
		});
	});

	describe('additional functionality', function()
{

    // Returns error, rather than dying.
		it('should gracefully fail on invalid criteria.', done =>
    {
			co(function *()
        {
				const criteria = {
					where : {
						name : {
							startsWith : 'Steve',
							captain    : 'Stop making a mess'
						}
					}
				};
				try
            {
					const records = yield Adapter.Find('finders', 'finders', criteria);
				}
				catch (err)
            {
					assert(err.toString() === 'Error: Invalid query syntax!');
					done();
				}
			});
		});

		it('should properly return records using `limit`', done =>
    {
			co(function *()
        {
				const criteria = {where: {age: [18, 19]}, limit: 1};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(records);
				assert(records.length === 1);
				assert(records[0].name === 'Steve Holt');
				done();
			});
		});
	});

	describe('when passed an gId of a record that does not exist', function()
{

		it('returns an empty array', function(done)
    {
			co(function *()
        {
				const criteria = {where: {gId: 9000001}};
				const records = yield Adapter.Find('finders', 'finders', criteria);
				assert(Array.isArray(records));
				assert(records.length === 0);
				done();
			});
		});
	});
});

describe('adapter complex`.find()`', function()
{
	before(function(done)
{
		const definition = {
			gId : {
				type          : 'integer',
				primaryKey    : true,
				autoIncrement : true
			},
			name : {
				type : 'string'
			},
			age : {
				type : 'integer'
			}
		};

		Support.Setup('finders', 'finders', definition, function(err)
        {
			co(function *()
            {
				const coArr = [
					co(Adapter.Create('finders', 'finders', {name: 'Steve Holt', age: 19})),
					co(Adapter.Create('finders', 'finders', {name: 'Annyong', age: 18})),
					co(Adapter.Create('finders', 'finders', {name: 'frank', age: 11})),
					co(Adapter.Create('finders', 'finders', {name: 'steve', age: 12})),
					co(Adapter.Create('finders', 'finders', {name: 'holt', age: 13})),
					co(Adapter.Create('finders', 'finders', {name: '周星驰', age: 14})),
					co(Adapter.Create('finders', 'finders', {name: '周润发', age: 15})),
					co(Adapter.Create('finders', 'finders', {name: '李连杰', age: 16}))
				];
				const result = yield coArr;
				console.info(result);
				done();
			});
		});
	});

	after(function(done)
{
		Support.Teardown('finders', 'finders', done);
	});
/**
    it('should properly return records using `lessThan (<)` and `greaterThan (>)`', done =>
    {
        co(function *()
        {
            const criteria =  { where: { age: { greaterThan: 15, lessThan:19 } } };
            let records = yield Adapter.Find('finders', 'finders', criteria);
            assert(records);
            assert(records.length == 2);
            done();
        });
    });**/

	it('should properly return records using `lessThan (<)` and `greaterThan (>)` and `startsWith`', done =>
    {
		co(function *()
        {
			const criteria = {where: {'or': {'age': 13, 'name': 'holt'}}};
			const records = yield Adapter.Find('finders', 'finders', criteria);
			assert(records);
            // assert(records.length == 1);
			done();
		});
	});
});
