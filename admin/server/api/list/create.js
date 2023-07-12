module.exports = async function (req, res) {
	var keystone = req.keystone;
	if (!keystone.security.csrf.validate(req)) {
		return res.apiError(403, 'invalid csrf');
	}

	let item = new req.list.model();
	await req.list.updateItem(
		item,
		req.body,
		{
			files: req.files,
			ignoreNoEdit: true,
			user: req.user,
		},
		async function (err) {
			if (err) {
				var status = err.error === 'validation errors' ? 400 : 500;
				var error = err.error === 'database error' ? err.detail : err;
				return res.apiError(status, error);
			} else {
				res.json(req.list.getData(item));
			}
		});
}
