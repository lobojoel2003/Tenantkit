/**
 * Serve the built site exactly as a static host like GitHub Pages would:
 * directories serve index.html, paths without a trailing slash redirect,
 * and missing files get 404.html with a 404 status.
 *
 *   npx tsx scripts/serve.ts [dir]        (PORT=4173, BASE_PATH=/Tenantkit optional)
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'build');
const port = Number(process.env.PORT ?? 4173);
const base = (process.env.BASE_PATH ?? '').replace(/\/$/, '');

const TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.webmanifest': 'application/manifest+json',
	'.txt': 'text/plain; charset=utf-8',
	'.woff2': 'font/woff2'
};

if (!existsSync(join(root, 'index.html'))) {
	console.error(`No site found in ${root}. Run "npm run build" first.`);
	process.exit(1);
}

function send(res: import('node:http').ServerResponse, status: number, file: string) {
	res.writeHead(status, {
		'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
		'cache-control': 'no-cache'
	});
	createReadStream(file).pipe(res);
}

createServer((req, res) => {
	const url = new URL(req.url ?? '/', 'http://localhost');
	let path: string;
	try {
		path = decodeURIComponent(url.pathname);
	} catch {
		res.writeHead(400).end();
		return;
	}
	const notFound = () => send(res, 404, join(root, '404.html'));

	if (base) {
		if (path === base) {
			res.writeHead(301, { location: `${base}/${url.search}` }).end();
			return;
		}
		if (!path.startsWith(`${base}/`)) return notFound();
		path = path.slice(base.length);
	}

	let file = resolve(root, `.${path}`);
	if (file !== root && !file.startsWith(root + sep)) return notFound();
	if (existsSync(file) && statSync(file).isDirectory()) {
		if (!path.endsWith('/')) {
			res.writeHead(301, { location: `${base}${path}/${url.search}` }).end();
			return;
		}
		file = join(file, 'index.html');
	}
	if (!existsSync(file) || !statSync(file).isFile()) return notFound();
	send(res, 200, file);
}).listen(port, () => {
	console.log(`Serving ${root} at http://localhost:${port}${base}/`);
});
