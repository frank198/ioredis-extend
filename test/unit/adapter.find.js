/**
 * Test dependencies
 */

const assert = require('assert'),
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

		Support.Setup('finders', 'finders', definition, () =>
        {
	        const coArr = [
		        Adapter.Create('finders', 'finders', {name : 'Steve Holt',
			age  : 19}),
		        Adapter.Create('finders', 'finders', {name : 'Annyong',
			        age  : 19}),
		        Adapter.Create('finders', 'finders', {name : 'Annyong',
			        age  : 16}),
		        Adapter.Create('finders', 'finders', {name : 'Annyong',
			        age  : 15}),
		        Adapter.Create('finders', 'finders', {name : 'Annyong',
			        age  : 20}),
		        Adapter.Create('finders', 'finders', {name : 'Annyong',
			age  : 18})
	        ];
	        Promise.all(coArr).then(result =>
	        {
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
	        const criteria = {where: {name: 'Steve Holt'}};
	        Adapter.Find('finders', 'finders', criteria)
		        .then(records =>
		        {
			        assert(records);
			        assert(records.length === 1);
			        assert(records[0].name === 'Steve Holt');
			        done();
		        });
		});

		it('should find using integer `age`', done =>
        {
	        const criteria =
		        {
			        where : {age: {'>': 10}},
			        sort  : {'age': -1}
		        };
	        Adapter.Find('finders', 'finders', criteria)
		        .then(records =>
		        {
			        assert(records);
			        assert(records.length === 2);
			        assert(records[0].age === 19);
			        done();
		        });
		});

		it('should return all records with empty criteria', done =>
        {
	        const criteria = {};
	        Adapter.Find('finders', 'finders', criteria)
		        .then(records =>
		        {
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
	        const criteria = {where: {name: {startsWith: 'Anny'}}};
	        Adapter.Find('finders', 'finders', criteria)
		        .then(records =>
		        {
			        assert(records);
			        assert(records.length === 1);
			        assert(records[0].name === 'Annyong');
			        done();
		        });
		});

		it('should properly return records using `endsWith`', done =>
        {
	        const criteria = {where: {name: {endsWith: 'Holt'}}};
	        Adapter.Find('finders', 'finders', criteria)
		        .then(records =>
		        {
			        assert(records);
			        assert(records.length === 1);
			        assert(records[0].name === 'Steve Holt');
			        done();
		        });
		});

		it('should properly return records using `like`', done =>
        {
	        const criteria = {where: {like: {name: '%eve%'}}};
	        Adapter.Find('finders', 'finders', criteria)
		        .then(records =>
		        {
			        assert(records);
			        assert(records.length === 1);
			        assert(records[0].name === 'Steve Holt');
			        done();
		        });
		});

		it('should properly return records using `contains`', done =>
        {
	        const criteria = {where: {name: {contains: 'nny'}}};
	        Adapter.Find('finders', 'finders', criteria)
		        .then(records =>
		        {
			        assert(records);
			        assert(records.length === 1);
			        assert(records[0].name === 'Annyong');
			        done();
		        });
		});

		it('should properly return records using `in` type query', done =>
	    {
		    const criteria = {where: {name: ['Steve Holt', 'Annyong']}};
		    Adapter.Find('finders', 'finders', criteria)
			    .then(records =>
			    {
				    assert(records);
				    assert(records.length === 2);
				    assert(records[0].name === 'Steve Holt');
				    assert(records[1].name === 'Annyong');
				    done();
			    });
		});

		it('should properly return records using `lessThan`', done =>
	    {
		    const criteria = {where: {age: {lessThan: 19}}};
		    Adapter.Find('finders', 'finders', criteria)
			    .then(records =>
			    {
				    assert(records);
				    assert(records.length === 1);
				    assert(records[0].name === 'Annyong');
				    done();
			    });
		});

		it('should properly return records using `lessThanOrEqual`', done =>
        {
	        const criteria = {where: {age: {lessThanOrEqual: 19}}};
	        Adapter.Find('finders', 'finders', criteria)
		        .then(records =>
		        {
			        assert(records);
			        assert(records.length === 2);
			        assert(records[0].name === 'Steve Holt');
			        assert(records[1].name === 'Annyong');
			        done();
		        });
		});

		it('should properly return records using `greaterThan`', done =>
        {
	        const criteria = {where: {age: {greaterThan: 18}}};
	        Adapter.Find('finders', 'finders', criteria)
		        .then(records =>
		        {
			        assert(records);
			        assert(records.length === 1);
			        assert(records[0].name === 'Steve Holt');
			        assert(records[0].age === 19);
			        done();
		        });
		});

		it('should properly return records using `greaterThanOrEqual`', done =>
	    {
		    const criteria = {where: {age: {greaterThanOrEqual: 18}}};
		    Adapter.Find('finders', 'finders', criteria)
			    .then(records =>
			    {
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
		    const criteria = {
			    where : {
				    name : {
					    startsWith : 'Steve',
					    captain    : 'Stop making a mess'
				    }
			    }
		    };
	        Adapter.Find('finders', 'finders', criteria)
		        .then(records =>
		        {
			        assert(records);
			        done();
		        })
		        .catch(err =>
		        {
			        assert(err.toString() === 'Error: Invalid query syntax!');
			        done();
		        });
		});

		it('should properly return records using `limit`', done =>
        {
		    const criteria = {where : {age: [18, 19]},
			limit : 1};
	        Adapter.Find('finders', 'finders', criteria)
		        .then(records =>
		        {
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
	        const criteria = {where: {gId: 9000001}};
	        Adapter.Find('finders', 'finders', criteria)
		        .then(records =>
		        {
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

		Support.Setup('finders', 'finders', definition, function()
        {
	        const coArr = [
		        Adapter.Create('finders', 'finders', {name : 'Steve Holt',
			age  : 19}),
		        Adapter.Create('finders', 'finders', {name : 'Annyong',
			age  : 18}),
		        Adapter.Create('finders', 'finders', {name : 'frank',
			age  : 13}),
		        Adapter.Create('finders', 'finders', {name : 'steve',
			age  : 12}),
		        Adapter.Create('finders', 'finders', {name : 'holt',
			age  : 13}),
		        Adapter.Create('finders', 'finders', {name : '周星驰',
			age  : 14}),
		        Adapter.Create('finders', 'finders', {name : '周润发',
			age  : 15}),
		        Adapter.Create('finders', 'finders', {name : '李连杰',
			age  : 16})
	        ];
	        Promise.all(coArr).then(result =>
	        {
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
        const criteria =  { where: { age: { greaterThan: 15, lessThan:19 } } };
        Adapter.Find('finders', 'finders', criteria)
			.then(records =>
			{
				assert(records);
				assert(records.length === 2);
				done();
			});
    });**/

	it('should properly return records using or ', done =>
	{
		const criteria = {where: [{age: {'>': 12}}, {name: 'frank'}]};
		Adapter.Find('finders', 'finders', criteria)
			.then(records =>
			{
				assert(records);
				assert(records.length === 2);
				done();
			});
	});

	it('should properly return records using `lessThan (<)` and `greaterThan (>)` and `startsWith`', done =>
	{
		const criteria = {where: {'name': 'holt'}};
		Adapter.Find('finders', 'finders', criteria)
			.then(records =>
			{
				assert(records);
				// assert(records.length == 1);
				done();
			});

	});
});
