# Phase 2.1 — Skill Config Parsing Findings

Date: 2026-11-04  
Scope: Doomsday 1.62.0 Unity AssetBundles; hero-skill, skill-group, skill, status, global-skill, and English localization configurations.

## 1. Scope and handling

The source archive and extracted game data under `DoomsdayData` were read only. No application code or app database was changed. The parser and its JSON exports are analysis artifacts under `RevEngPhase`.

The six decompressed SerializedFiles match the byte counts and SHA-256 digests recorded in `Phase 2.1 - Reverse Engineering Progress.md`. Their UnityFS/SerializedFile metadata identifies Unity `2022.3.62f2`, SerializedFile format 22, and MonoBehaviour data objects. The parser consumed the declared MonoBehaviour byte size for each file and exported the decoded TypeTree values.

## 2. Parsed source objects

| Source bundle | Serialized class | Records |
| --- | --- | ---: |
| `gameconfig_hero_skill_1938798020.ab` | `HeroSkillCfgData` | 1,033 |
| `gameconfig_skills_group_3930170623.ab` | `SkillsGroupCfgData` | 5,997 |
| `gameconfig_skills_1046730706.ab` | `SkillsCfgData` | 7,456 |
| `gameconfig_skill_status_694894448.ab` | `SkillStatusCfgData` | 2,648 |
| `gameconfig_skill_global_1185550054.ab` | `SkillGlobalCfgData` | 117 |
| `gameconfig_string_en_269349052.ab` | `StringCfgData` | 44,308 string index records |

The full decoded objects, including source bundle and serialized-file hashes, are in `artifacts/parsed/*.parsed.json`. `tools/parse_serialized_config.js` recreates those files from the copied bundles and decompressed artifacts. `tools/analyze_skill_configs.js` calculates selected reference counts.

## 3. Confirmed schema and observed links

The custom serialized data classes expose these relevant shapes:

- `HeroSkillCfgData.Data[]`: `SkillsGroupId`, `MultiplierGateSkillId`.
- `SkillsGroupCfgData.Data[]`: `Id`, `Lv`, `Skills[]`, `GroupId`, `SkillType`, `SkillStatus`, localization-key arrays, and presentation fields.
- `SkillsCfgData.Data[]`: `Id`, action/target/range/value fields, status-related fields, timing/cost fields, effects, and trigger/pet fields.
- `SkillStatusCfgData.Data[]`: `Id`, status behavior fields, `SkillId`, and `NameKey`, `DesShowKey`, `StatusDesKey`.
- `SkillGlobalCfgData.Data[]`: `Type`, `Index`, description/value fields.
- `StringCfgData`: `Data[]` entries `{Id, Start, Length}`, `TextPool`, and `StrChunks[]` entries `{TextOrKey:{Start,Length}, KeyIndex, Param:{Start,Length}}`.

Observed referential checks:

| Candidate link | Result | Interpretation limit |
| --- | --- | --- |
| `HeroSkillCfgData.SkillsGroupId` → `SkillsGroupCfgData.Id` | 988 of 1,033 references match; 45 do not. The 1,033 references have 1,033 distinct values. | Strong structural candidate based on field name and matching IDs. The 45 unmatched values need investigation; they are not silently repaired. |
| `SkillsGroupCfgData.Skills[]` → `SkillsCfgData.Id` | 7,063 reference slots, all distinct; all referenced IDs exist. | Strong structural candidate; exact runtime semantics of the array are not established. |
| `SkillsGroupCfgData.SkillStatus` → `SkillStatusCfgData.Id` | 24 nonzero references across 12 distinct IDs; all IDs exist. | Candidate link supported by matching values and field names. |
| `SkillStatusCfgData.SkillId` → `SkillsCfgData.Id` | Field exists in serialized schema. | Not yet quantified or behaviorally validated. |
| `SkillsCfgData` status arrays/fields → `SkillStatusCfgData.Id` | Status-named fields exist. | Not treated as confirmed foreign keys; their values and semantics need separate analysis. |
| Localization key fields → `StringCfgData` | Key-bearing fields and a string index/pool/chunk structure exist. | Key-to-English-text reconstruction is unresolved; a field name or coincident string is not proof of a join. |

`HeroSkillCfgData` records do not contain an `Id` field in the decoded object. Therefore they should not be counted as unique by a nonexistent `Id`; each has a distinct `SkillsGroupId` in this bundle.

## 4. Localization status

English text is present in `TextPool`, and the string bundle contains 44,308 `Data` records with distinct `Id` values. The serialized layout also contains `StrChunks`, with offsets and lengths into the text pool plus `KeyIndex` and parameter spans. The meaning of the chunk/index encoding and the relationship between localization keys such as `skill_name1` and these IDs have not been decoded. No key-to-text table has been manufactured from string occurrence alone.

## 5. Integrity and open questions

- The six parsed record counts are consistent with complete TypeTree reads; the existing decompressed artifacts match the progress-note hashes.
- There are no duplicate IDs in the `Id` fields for the five parsed tables that expose `Id`. The hero-skill table has no `Id` field.
- Forty-five `SkillsGroupId` values in the hero-skill config have no matching group `Id` in this bundle. Determine whether they are stale, cross-version, special-case, or resolved in another bundle before classifying them.
- Group skill references currently all resolve, but that does not establish whether every referenced skill is active or player-visible.
- `SkillGlobalCfgData` contains 117 rows; field names such as `Type`, `Index`, `Typedesc`, `Value`, and `Desc` are observed, but formula semantics and units remain unknown.
- Several fields have apparent typos or opaque names (for example `Aciton` in status records and compact action/effect fields in skill records). Preserve source spellings until corroborated against code or runtime behavior.
- String IDs appear numeric and distinct, but the generation/hash algorithm and the chunk `KeyIndex` values remain unknown.

## 6. Recommended next reverse-engineering order

1. Decode `StringCfgData` chunk boundaries and index semantics, then validate key-to-text joins using several known skill names and descriptions.
2. Investigate the 45 unmatched `SkillsGroupId` values against the entire 988-bundle source set and, if needed, other versioned bundles. Record exact source evidence for each match.
3. Validate `SkillsGroupCfgData.Skills[]` and `HeroSkillCfgData.MultiplierGateSkillId` references against skill IDs and observed group/level patterns; keep any unmapped values explicit.
4. Trace status references through `SkillStatusCfgData.SkillId` and the status-related fields of `SkillsCfgData` without assuming every similarly named field has the same target type.
5. Compare validated source records to the current app skill JSON in a separate diff report. Do not import records or translations until key joins and version scope are established.
6. Start the next domain only after the skill/localization relationships are documented; use each bundle's serialized schema and cross-reference checks as evidence, not its filename alone.
