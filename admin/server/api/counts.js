var async = require('async');

module.exports = function (req, res) {
	var keystone = req.keystone;
	var counts = {};
	async.each(keystone.lists, async function (list) {
		try {
			const count = await list.model.countDocuments();
			counts[list.key] = count;
		} catch(err) {
			return res.apiError('database count error', err);
		}
	}, function (err) {
		if (err) return res.apiError('database error', err);
		return res.json({
			counts: counts,
		});
	});
};
