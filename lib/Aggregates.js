/**
 * Created by frank on 16-11-22.
 */

class Aggregates
{
	constructor(options, results)
    {
        // Check if there is a grouping
		if (!options.groupBy && !options.sum && !options.average && !options.min && !options.max)
        {
			return {result: results};
		}

		if (!options.sum && !options.average && !options.min && !options.max)
        {
			return {error: new Error('Cannot groupBy without a calculation')};
		}

		this.groupedResults = [];
		this.finishedResults = [];

        // Group Results and set defaults
		if (options.groupBy)
        {
			this.group(options.groupBy, results);
		}
		else
        {
			this.groupedResults.push(results);
			this.finishedResults.push({});
		}

		if (options.sum) this.sum(options.sum);
		if (options.average) this.average(options.average);
		if (options.min) this.min(options.min);
		if (options.max) this.max(options.max);
		return {result: this.finishedResults};
	}

    /**
     * Group Results
     *
     * @param {Object} groupBy
     * @param {Array} results
     * @api private
     */
	group(groupBy, results)
    {
		const groups = [],
			groupCollector = {};

        // Go through the results
		results.forEach(item =>
        {
			let key = '';

			groupBy.forEach(groupKey =>
            {
				key += `${item[groupKey]}---`;
			});

			if (groupCollector[key]) return groupCollector[key].push(item);
			groupCollector[key] = [item];
		});

		for (const key in groupCollector)
		{
			groups.push(groupCollector[key]);
		}

		this.groupedResults = groups;
        // Then we generate stub objects for adding/averaging
		groups.forEach(group =>
        {
			const stubResult = {};
            // Groupresult will look like this: { type: 'count', a2: 'test' }
			groupBy.forEach(groupKey =>
            {
                // Set the grouped by value to the value of the first results
				stubResult[groupKey] = group[0][groupKey];
			});
			this.finishedResults.push(stubResult);
		});
	}

    /**
     * Sum Results
     *
     * @param {Array} sum
     * @api private
     */
	sum(sumArr)
    {
        // fill in our stub object with those keys, set to sum 0
		sumArr.forEach(sumKey =>
        {
			this.finishedResults.forEach(stub =>
            {
				stub[sumKey] = 0;
			});
		});

        // iterate over all groups of data
		this.groupedResults.forEach((group, i) =>
        {
            // sum for each item
			group.forEach(item =>
			{
				sumArr.forEach(sumKey =>
				{
					if (typeof item[sumKey] === 'number')
					{
						this.finishedResults[i][sumKey] += item[sumKey];
					}
				});
			});
		});
	}

    /**
     * Average Results
     *
     * @param {Array} average
     * @api private
     */

	average(averageArr)
    {
        // fill in our stub object with those keys, set to sum 0
		averageArr.forEach(sumKey =>
        {
			this.finishedResults.forEach(stub =>
			{
				stub[sumKey] = 0;
			});
		});

        // iterate over all groups of data
		this.groupedResults.forEach((group, i) =>
        {
			averageArr.forEach(sumKey =>
            {
                // count up how many numbers we have, so we know how much to divide by
				let cnt = 0;
                // average for each item
				group.forEach(item =>
                {
					if (typeof item[sumKey] === 'number')
                    {
						this.finishedResults[i][sumKey] += item[sumKey];
						cnt += 1;
					}
				});

				this.finishedResults[i][sumKey] /= cnt;
			});
		});
	}

    /**
     * Max Results
     *
     * @param {Array} max
     * @api private
     */
	max(maxArr)
    {
        // iterate over all groups of data
		this.groupedResults.forEach((group, i) =>
        {
			maxArr.forEach(sumKey =>
            {
                // keep track of current maximum
				let max = -Infinity;
                // update max
				group.forEach(item =>
				{
					if (typeof item[sumKey] === 'number')
					{
						if (item[sumKey] > max) max = item[sumKey];
					}
				});

				this.finishedResults[i][sumKey] = isFinite(max) ? max : null;
			});
		});
	}

    /**
     * Min Results
     *
     * @param {Array} min
     * @api private
     */

	min(minArr)
    {
        // iterate over all groups of data
		this.groupedResults.forEach((group, i) =>
        {
			minArr.forEach(sumKey =>
            {
                // keep track of current minimum
				let min = Infinity;
                // update min
				group.forEach(item =>
                {
					if (typeof item[sumKey] === 'number')
                    {
						if (item[sumKey] < min) min = item[sumKey];
					}
				});

				this.finishedResults[i][sumKey] = isFinite(min) ? min : null;
			});
		});
	}
}

module.exports = Aggregates;