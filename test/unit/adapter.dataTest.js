
const assert = require('assert'),
	Adapter = require('../../'),
	Support = require('../support')(Adapter);

describe('adapter data updateTest', function()
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

		Support.Setup('ccjh', 'ccjh', {}, () =>
		{
			Adapter.Define('ccjh', 'playerRole', definition);
			done();
		});
	});

	after(function(done)
	{
		Support.Teardown('ccjh', 'playerRole', done);
	});

	describe('create', function()
  {
		it('should properly create a new record', function(done)
		{
			const attributes = {
				id   : 1,
				name : 'Darth Vader'
			};

			Adapter.Create('ccjh', 'playerRole', attributes).then(model =>
			{
				assert(model.id === 1);
				assert(model.name === 'Darth Vader');
				done();
			});
		});
	});

});
