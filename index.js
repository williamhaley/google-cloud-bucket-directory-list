const listObjects = ((config = {}) => {
	let settings = {};

	const defaults = { excludedObjects: [], bucketName: null };

	settings = Object.assign(settings, defaults);
	settings = Object.assign(settings, config);

	// `bucket` is required because we cannot always infer the bucket name from
	// the URL. (e.g. a vanity DNS URL like `http://myfiles.com/`)
	settings.bucketName === null && assert('Bucket name must be specified!');

	// Templates for our UI.
	const template = $('#template-object').html();
	const render   = Handlebars.compile(template);

	// Current path (e.g. `/` or `/subdir/`).
	const currentPath = document.location.pathname || '';

	// Variables for our REST query.
	const restURL = `https://www.googleapis.com/storage/v1/b/${settings.bucketName}/o`;
	const query   = { prefix: currentPath.replace('/', '') };

	// Call the API and update the view with the parsed results.
	$.get(restURL, query).done((res) => {
		$('tbody').html(parseResponse(res).map((object) => render(object)));
	}).catch((err) => {
		console.log(err);
	});

	// Parse the response.
	function parseResponse(res) {
		let objects = [];
		let dirs    = {};

		res.items.forEach((item) => {
			const key = item.name;

			console.log(item);

			// Parse the path info from the key.
			const parts = key.match(/(.*\/)?(.*)/);

			// `objectPath` will either be `undefined` or a prefix
			// like `subdir/`.
			const objectPath = parts[1] || '';
			const objectName = parts[2];

			if (objectName === '') {
				return;
			}

			// See if the object is in the current directory/path.
			const isObjectInCurrentDirectory = `/${objectPath}` === currentPath;

			// Is the object name in our list of exclusions?
			const isObjectExcluded = settings.excludedObjects.includes(objectName);

			if (!isObjectInCurrentDirectory) {
				dirs[objectPath] = ({
					date: null,
					size: 0,
					name: objectPath,
					url:  `${document.location.origin}/${objectPath}`
				});
			}

			if (isObjectExcluded || !isObjectInCurrentDirectory) {
				return;
			}

			objects.push({
				date: item.updated,
				size: item.size,
				name: objectName,
				url:  `${document.location.origin}/${item.name}`
			});
		});

		// If we're not in the root directory, add a `..` dir to go up a level.
		if (currentPath !== '/') {
			dirs['..'] = {
				date: null,
				size: 0,
				name: '..',
				url:  `${document.location.origin}${document.location.pathname}..`
			};
		}

		console.log(objects);

		return Object.keys(dirs).sort().map((d => dirs[d])).concat(objects);
	}

	function assert(message) { alert(message); throw new Error(message) }
});
