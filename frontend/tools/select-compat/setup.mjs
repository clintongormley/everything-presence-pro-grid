// Builds the gitignored cache: one bundle of the real `ha-select` for each Home
// Assistant frontend tag, plus a bundle of the panel code from `src/`. The tag
// bundles are slow to make and are reused. The panel bundle is rebuilt on every
// run, because it is what the run is testing.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import esbuild from "esbuild";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, "../..");
const PATCH = join(HERE, "mwc-list.patch");
export const CACHE = join(HERE, ".cache");
export const OUT = join(CACHE, "out");
export const PANEL_BUNDLE = join(CACHE, "panel.js");

/**
 * `oldSelect`: `ha-select` is built on mwc-select and takes `ha-list-item`
 * children. From 2026.3 it takes `.options`, and the children are ignored.
 * `patchMwcList`: HA ships this tag with a patch to `@material/mwc-list`, needed
 * because its lit no longer has the old `queryAssignedNodes` signature. Without
 * the patch the build gives no warning and picking an option fails.
 */
export const TAGS = [
	{ tag: "20250205.0", ha: "2025.2", oldSelect: true },
	{ tag: "20260128.6", ha: "2026.2", oldSelect: true, patchMwcList: true },
	{ tag: "20260304.0", ha: "2026.3", oldSelect: false },
	{ tag: "20261028.4", ha: "2026.11", oldSelect: false },
];

export const tagBundle = (tag) => join(tagDir(tag), "bundle.js");
const tagDir = (tag) => join(CACHE, "tags", tag);
const readyStamp = (tag) => join(tagDir(tag), ".ready");

const execFileAsync = promisify(execFile);

// `npm run` exports npm_* variables that describe this package, and they must
// not leak into the nested `npm i`.
const cleanEnv = () =>
	Object.fromEntries(
		Object.entries(process.env).filter(
			([key]) => !key.toLowerCase().startsWith("npm_"),
		),
	);

const exec = (command, args, options = {}) =>
	execFileAsync(command, args, {
		env: cleanEnv(),
		maxBuffer: 64 * 1024 * 1024,
		...options,
	});

/** Changing the setup or the patch makes every cached tag stale. */
function fingerprint() {
	const hash = createHash("sha256");
	hash.update(readFileSync(fileURLToPath(import.meta.url)));
	hash.update(readFileSync(PATCH));
	return hash.digest("hex");
}

function isReady({ tag, patchMwcList }) {
	if (!existsSync(tagBundle(tag))) return false;
	if (!existsSync(readyStamp(tag))) return false;
	if (readFileSync(readyStamp(tag), "utf8") !== fingerprint()) return false;
	return !patchMwcList || isMwcListPatched(tag);
}

/** Returns the file's bytes, or null if the tag has no such file. */
async function getFile(tag, path) {
	const url = `repos/home-assistant/frontend/contents/${path}?ref=${tag}`;
	try {
		const { stdout } = await exec("gh", ["api", url, "--jq", ".content"]);
		return Buffer.from(stdout, "base64");
	} catch (error) {
		// A relative import is tried with several endings, so a 404 is normal.
		// Anything else (no login, rate limit, no network) must not look like one.
		if (String(error.stderr).includes("HTTP 404")) return null;
		throw new Error(`gh api failed for ${path} at ${tag}: ${error.stderr}`);
	}
}

const IMPORT =
	/(?:import|export)\s+(type\s+)?(?:[^'";]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function relativeCandidates(importer, specifier) {
	const path = normalize(join(dirname(importer), specifier));
	if (/\.(ts|js|css|json)$/.test(path)) return [path];
	return [`${path}.ts`, `${path}.js`, `${path}/index.ts`];
}

const packageName = (specifier) =>
	specifier
		.split("/")
		.slice(0, specifier.startsWith("@") ? 2 : 1)
		.join("/");

/**
 * Downloads the entry files and everything they import, and returns the names
 * of the npm packages they import. Type-only imports are skipped, because they
 * leave nothing in the bundle.
 */
async function fetchSources(tag, entries) {
	const seen = new Set();
	const packages = new Set();
	const fetched = new Set();
	let frontier = entries;
	while (frontier.length) {
		const batch = [...new Set(frontier)].filter((path) => !seen.has(path));
		for (const path of batch) seen.add(path);
		frontier = [];
		for (let i = 0; i < batch.length; i += 8) {
			const paths = batch.slice(i, i + 8);
			const files = await Promise.all(paths.map((p) => getFile(tag, p)));
			paths.forEach((path, index) => {
				const bytes = files[index];
				if (!bytes) return;
				fetched.add(path);
				const destination = join(tagDir(tag), path);
				mkdirSync(dirname(destination), { recursive: true });
				writeFileSync(destination, bytes);
				for (const match of bytes.toString("utf8").matchAll(IMPORT)) {
					if (match[1]) continue;
					const specifier = match[2] ?? match[3];
					if (specifier.startsWith(".")) {
						frontier.push(...relativeCandidates(path, specifier));
					} else {
						packages.add(packageName(specifier));
					}
				}
			});
		}
	}
	const missing = entries.filter((path) => !fetched.has(path));
	if (missing.length) {
		throw new Error(`${tag} has no ${missing.join(", ")}`);
	}
	return packages;
}

/** Pins each package to the version the tag's own `package.json` asks for. */
async function writePackageJson(tag, packages) {
	const upstream = JSON.parse(await getFile(tag, "package.json"));
	const versions = {
		...upstream.devDependencies,
		...upstream.dependencies,
		...upstream.resolutions,
	};
	const dependencies = {};
	for (const name of [...packages].sort()) {
		if (versions[name]) dependencies[name] = versions[name];
	}
	// Upstream points this at a Yarn patch, which npm cannot install.
	if (dependencies["@material/mwc-list"]) {
		dependencies["@material/mwc-list"] = "0.27.0";
	}
	const manifest = {
		name: "x",
		private: true,
		dependencies,
		overrides: { lit: dependencies.lit },
	};
	writeFileSync(
		join(tagDir(tag), "package.json"),
		JSON.stringify(manifest, null, 1),
	);
}

const mwcListDir = (tag) =>
	join(tagDir(tag), "node_modules/@material/mwc-list");

const isMwcListPatched = (tag) =>
	readFileSync(join(mwcListDir(tag), "mwc-list-base.js"), "utf8").includes(
		"queryAssignedElements",
	);

async function patchMwcList(tag) {
	await exec("patch", ["-p1", "--forward", "--batch", "-i", PATCH], {
		cwd: mwcListDir(tag),
	});
	if (!isMwcListPatched(tag)) {
		throw new Error(`mwc-list patch did not take effect on ${tag}`);
	}
}

/**
 * esbuild walks up from the cache into `frontend/node_modules`, so a package the
 * tag failed to install would quietly build against the panel's own copy.
 */
function assertBuiltOnlyFromTag(tag, metafile) {
	const strays = Object.keys(metafile.inputs).filter((input) =>
		relative(tagDir(tag), resolve(FRONTEND, input)).startsWith(".."),
	);
	if (strays.length) {
		throw new Error(`${tag} bundle used files outside it: ${strays}`);
	}
}

/** HA's sources import `lit/directives/live`, which needs an ending added. */
const resolveBareImports = {
	name: "resolve-bare-imports",
	setup(build) {
		const filter = /^(lit|@lit|@home-assistant\/webawesome|lit-html|@material)/;
		build.onResolve({ filter }, async (args) => {
			if (args.pluginData?.retrying) return undefined;
			for (const path of [
				args.path,
				`${args.path}.js`,
				`${args.path}/index.js`,
			]) {
				const found = await build.resolve(path, {
					resolveDir: args.resolveDir,
					kind: args.kind,
					pluginData: { retrying: true },
				});
				if (!found.errors.length) return found;
			}
			return undefined;
		});
	},
};

async function buildTagBundle({ tag, oldSelect }) {
	const entry = join(tagDir(tag), "entry.ts");
	const imports = [
		"ha-select",
		"ha-svg-icon",
		...(oldSelect ? ["ha-list-item"] : []),
	];
	writeFileSync(
		entry,
		imports.map((name) => `import "./src/components/${name}";\n`).join(""),
	);
	const tsconfig = join(tagDir(tag), "tsconfig.json");
	writeFileSync(
		tsconfig,
		JSON.stringify({
			compilerOptions: {
				experimentalDecorators: true,
				useDefineForClassFields: false,
				target: "es2021",
			},
		}),
	);
	const { metafile } = await esbuild.build({
		absWorkingDir: FRONTEND,
		entryPoints: [entry],
		bundle: true,
		format: "iife",
		outfile: tagBundle(tag),
		tsconfig,
		metafile: true,
		plugins: [resolveBareImports],
		logLevel: "error",
		define: {
			__DEV__: "false",
			__DEMO__: "false",
			__BUILD__: '"latest"',
			__VERSION__: '"x"',
			__BACKWARDS_COMPAT__: "false",
			__STATIC_PATH__: '"/"',
			__HASS_URL__: '""',
			__SUPERVISOR__: "false",
			__SYNTHETIC_DOM__: "false",
		},
		loader: { ".css": "text" },
		logOverride: { "direct-eval": "silent" },
	});
	assertBuiltOnlyFromTag(tag, metafile);
}

async function setUpTag(tagConfig) {
	const { tag, oldSelect } = tagConfig;
	console.log(`Setting up ${tag} (Home Assistant ${tagConfig.ha})...`);
	rmSync(tagDir(tag), { recursive: true, force: true });
	mkdirSync(tagDir(tag), { recursive: true });

	const entries = [
		"src/components/ha-select.ts",
		"src/components/ha-svg-icon.ts",
	];
	if (oldSelect) entries.push("src/components/ha-list-item.ts");
	const packages = await fetchSources(tag, entries);

	// `src/resources/icon-metadata.ts` imports this generated file. The dropdowns
	// use `ha-svg-icon` paths and not the icon set, so `ha-icon` only has to draw
	// nothing without raising a page error. An empty list throws in
	// `findIconChunk`, and a real chunk name ends in a cache write to IndexedDB,
	// which the `about:blank` test page denies. `constructor` avoids both: `ha-icon`
	// checks `chunk in chunks` on a plain object, so it counts as already loaded.
	if (!oldSelect) {
		const stub = join(tagDir(tag), "build/mdi/iconMetadata.json");
		mkdirSync(dirname(stub), { recursive: true });
		writeFileSync(stub, '{"version":"0","parts":[{"file":"constructor"}]}\n');
	}

	await writePackageJson(tag, packages);
	await exec("npm", ["i", "--ignore-scripts", "--no-audit", "--no-fund"], {
		cwd: tagDir(tag),
	});
	if (tagConfig.patchMwcList) await patchMwcList(tag);
	await buildTagBundle(tagConfig);
	writeFileSync(readyStamp(tag), fingerprint());
	console.log(`  built, ${statSync(tagBundle(tag)).size} bytes`);
}

export async function ensureTags() {
	for (const tagConfig of TAGS) {
		if (isReady(tagConfig))
			console.log(`Reusing ${tagConfig.tag} from the cache`);
		else await setUpTag(tagConfig);
	}
}

export async function buildPanelBundle() {
	mkdirSync(OUT, { recursive: true });
	await esbuild.build({
		absWorkingDir: FRONTEND,
		entryPoints: [join(HERE, "entry.ts")],
		bundle: true,
		format: "iife",
		outfile: PANEL_BUNDLE,
		tsconfig: join(FRONTEND, "tsconfig.json"),
		logLevel: "error",
		define: { "process.env.NODE_ENV": '"production"' },
		loader: { ".css": "text", ".svg": "text", ".png": "dataurl" },
	});
}
