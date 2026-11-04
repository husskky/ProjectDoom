# Game data

`manifest.json` is the data entry point used by `app.js`. Update it when adding a new data file or skill group.

- `heroes.json`: hero catalog. Each record has `id`, `name`, `squad`, `category`, `superhero`, and `role`.
- `skills-<squad>.json`: skill records keyed by hero ID. Each skill has `kind` (`rage`, `passive`, or `awakening`), `name`, and `description`.
- `hero-changes.json`: notes about data changes, keyed by hero ID.
- `troops.json`: troop stats and costs by tier. Costs are resource maps; times are in seconds.
- `research.json`: research records with `id`, `name`, and `levels`. Each level has `seconds` and a resource `cost` map.

Keep IDs numeric in the hero catalog and use the same IDs as keys in skills and change notes. When adding a hero, add its skill record to the file for its squad and update the manifest version when the source data changes.
