# Repository Guidelines

## Project Structure & Module Organization

Fontkit is a font engine for Node.js and browsers. Implementation lives in `src/`: `tables/` defines binary font tables, `glyph/` handles outlines and metrics, `layout/`, `opentype/`, and `aat/` implement shaping, and `subset/` encodes font subsets. Browser exports start in `src/index.js`; Node exports start in `src/node.js`.

Tests live in `test/`, with font fixtures and their licenses in `test/data/`. `scripts/clean.js` removes generated artifacts. Parcel writes distributable bundles to the ignored `dist/` directory.

## Build, Test, and Development Commands

- `npm install`: install dependencies and run the existing `prepublish` lifecycle to generate shaping data and build bundles.
- `npm run build`: build Node/browser CommonJS and ES module bundles with Parcel.
- `npm test`: rebuild bundles, then run the complete Mocha suite.
- `npm run mocha -- test/glyph_mapping.js`: run one test file against the current build; rebuild after source changes.
- `npm run coverage`: run Mocha through c8 against the current build.
- `npm run trie:data`, `npm run trie:use`, `npm run trie:indic`: regenerate shaping data after changing generators or state machines.
- `npm run prepublish`: clean, regenerate all shaping data, and build. `npm run clean` also removes shaping assets, so regenerate them before rebuilding.

## Coding Style & Naming Conventions

Use JavaScript ES modules, two-space indentation, semicolons, and generally single-quoted strings. Match surrounding code where conventions differ. Use PascalCase for classes and class filenames (`TTFGlyph.js`), camelCase for methods and variables, and exact font-table tags for table modules (`cmap.js`, `GPOS.js`). No formatter or linter is configured; keep changes focused and avoid unrelated formatting.

## Testing Guidelines

Use Mocha `describe`/`it` blocks and Node's `assert`. Name test files by behavior, following `test/glyph_mapping.js` and `test/variations.js`. Add regression tests for parsing, shaping, mapping, or metrics changes; use `test/issues.js` for issue-specific regressions. Prefer existing fixtures; include licensing and provenance for new fonts. Tests import the built package as `fontkit`. Run `npm test` before submitting. No numeric coverage threshold is configured.

## Commit & Pull Request Guidelines

Prefer small, self-contained changes; they are most likely to be merged. Keep each PR focused on one fix or feature, and submit unrelated changes separately.

Recent commits use short, descriptive subjects such as “Map space and missing code points correctly,” often with issue or PR numbers. Follow that style; Conventional Commit prefixes are not established. Keep commits focused. PR descriptions should explain the affected behavior, reproduction or regression case, linked issues, and validation commands/results. Update `README.md` when public API behavior changes. Update `CHANGELOG.md` for notable changes.
