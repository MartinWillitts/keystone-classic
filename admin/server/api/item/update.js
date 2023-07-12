module.exports = async function (req, res) {
	var keystone = req.keystone;
	if (!keystone.security.csrf.validate(req)) {
		return res.apiError(403, 'invalid csrf');
	}

	let item;
	try {
		item = await req.list.model.findById(req.params.id);
		if (!item) return res.status(404).json({ error: 'not found', id: req.params.id });
	} catch(err) {
		return res.status(500).json({ error: 'database error', detail: err });
	}

	await req.list.updateItem(item, req.body, { files: req.files, user: req.user }, async function (err) {
		if (err) {
			var status = err.error === 'validation errors' ? 400 : 500;
			var error = err.error === 'database error' ? err.detail : err;
			return res.apiError(status, error);
		}
		// Reload the item from the database to prevent save hooks or other
		// application specific logic from messing with the values in the item
		try {
			const updatedItem = await req.list.model.findById(req.params.id);
			res.json(req.list.getData(updatedItem));
		} catch(err) {
			return res.status(500).json({ error: 'database error', detail: err });
		}
	});
};
