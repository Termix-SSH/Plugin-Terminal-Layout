# Contributing to Terminal Layout

## Development

```bash
npm run build      # build into dist/
npm run test       # run this plugin's tests
npm run typecheck  # type-check this plugin
npm run validate   # check manifest.json
npm run format     # format the code with Prettier
```

## Docs

The docs for this plugin are in [docs/](docs/) and are published at https://docs.termix.site/plugins/terminal-layout. Settings, permissions, services, environment variables and the API reference are made from `manifest.json` and the `@openapi` comments in the code, so keep those up to date instead of writing them by hand. See [writing docs](https://docs.termix.site/develop/docs).

## Settings search

The Settings search reads `src/frontend/settings/settings-search-index.ts`, which is made from the settings sections. After you change one, run:

```bash
npm run generate:settings-index
```

## Classic Layout

Terminal Layout started as a copy of [Host Layout](https://github.com/Termix-SSH/Plugin-Host-Layout), itself a copy of [Classic Layout](https://github.com/Termix-SSH/Plugin-Classic-Layout). The Dashboard, Manage tab, host and credential editors, Settings and admin pages are the same code. When one of those gets a fix in Classic Layout, bring it over here too. The parts that are only here live in `src/frontend/layout/` (layout, status bar, start screen, palette) and `src/frontend/shell/prefix-*.ts` (prefix keys).
