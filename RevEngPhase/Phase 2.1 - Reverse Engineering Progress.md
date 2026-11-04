# Phase 2.1 — Reverse Engineering Progress

Date: 2026-11-04
Scope: Doomsday Unity AssetBundles; skill configuration and English localization.

## 1. Source and extraction state

The source archive `doomsday_part01.zip` is present in the working directory. The following extracted/decompressed binary artifacts are available:

| Artifact | Size (bytes) | SHA-256 |
|---|---:|---|
| `gameconfig_string_en_269349052.ab.bin` | 4,536,148 | `6b10aed2e77041027c2189a01bf6dae0e84889e095219be1b8a941fde497fc82` |
| `gameconfig_skills_group_3930170623.ab.bin` | 1,184,892 | `60428b84188418b56fd5457bdac8df77a9016860a671780100a79f5d0225d4d9` |
| `gameconfig_skills_1046730706.ab.bin` | 2,758,492 | `219e21a940b6a234782bf61a0859c9fbfbb4850176c010b37888abe01f8a94de` |
| `gameconfig_skill_status_694894448.ab.bin` | 571,796 | `af249a3b364cb7f9d3e94614fec4bd2aefd9638ceed598ae139165b245b97328` |
| `gameconfig_skill_global_1185550054.ab.bin` | 17,148 | `24ecb4a320853d45e979eda883e596583a23e96c6fda8c0ee08c29d00d58883f` |
| `hero_skill_bundle_data.bin` | 13,016 | `26de99fa02d2293ce3144f879bce12c02ad9facefe89417bcc0eb4926e38bb19` |

The `.bin` artifacts are decompressed/extracted binary data, not yet normalized Unity object exports. Their contents must not be treated as fully parsed records.

## 2. Confirmed class and field metadata

### `gameconfig_hero_skill`

- Class: `HeroSkillConfig`
- Namespace: `IGG.Game.Data.Config`
- Assembly: `dls.config`
- Data class: `HeroSkillCfgData`
- Fields observed: `SkillsGroupId`, `MultiplierGateSkillId`

### `gameconfig_skills_group`

- Class: `SkillsGroupConfig`
- Namespace: `IGG.Game.Data.Config`
- Assembly: `dls.config`
- Data class: `SkillsGroupCfgData`
- Fields observed: `Skills`, `Icon`, `Power`, `Preview`, `GroupId`, `SkillType`, `SkillStatus`, `MultiplierPreview`, `NameKey`, `DesKey`, `ShortDescriptionKey`, `MultiplierSkillDesKey`.

### `gameconfig_skills`

- Class: `SkillsConfig`
- Fields observed include `Name`, `SkillRange`, `SkillTargetRange`, `DamageRecoveryType`, `SkillValue`, `SkillValue2`, `SkillType2Value`, `FullDamage`, `DamageRate`, `SkillCd`, `SkillCost`, `DisSkills`, `IsComboSkill`, `LogSkillTriggerNum`, `PetSkillType`, and `PetActionSkill`.

### `gameconfig_string_en`

- Class: `StringConfig`
- Data class: `StringCfgData`
- Namespace: `IGG.Framework.Config`
- Assembly: `dls.framework`
- Fields observed: `Start`, `Length`, `TextPool`, `StrChunk2`, `StrChunks`, `StrIndex`, `TextOrKey`, `KeyIndex`, `Param`.
- English text is present in the extracted payload. For example, the byte sequences `Barrage Fire`, `Ferocious State`, `Guardian Deity`, and `Increases Ranged Squad ATK` occur in the file.
- The text payload contains concatenated strings and binary index/chunk structures. The key-to-text mapping has not yet been reconstructed.

## 3. Corrected key inventory

The following counts are from unique regex matches in `gameconfig_skills_group_3930170623.ab.bin`:

| Pattern | Unique matches |
|---|---:|
| `skill_name` key variants | 496 |
| `skill_des` key variants | 490 |
| `icon_skill` key variants | 499 |
| `multi_hero<id>_skill<n>` | 389 |

Correction to an earlier interim message: the earlier values of 492 `skill_des` keys and 511 `icon_skill` keys were not accurate. Recounting the extracted binary gives 490 and 499 respectively.

These are key-pattern counts, not counts of confirmed active skills or successfully decoded translations.

## 4. Hero-reference comparison

- Distinct hero-like IDs appearing in `multi_hero<id>_skill<n>` references: 80.
- Distinct hero IDs represented in the five current Ranged Desk skill JSON files: 64.
- Five current app hero IDs without a matching `multi_hero` reference in this bundle: `1121`, `1122`, `1123`, `1124`, `1125`.
- Twenty-one IDs occur in the bundle references but are not present in the current skill JSON files: `1001`, `1002`, `1003`, `1004`, `1005`, `1007`, `1008`, `1012`, `1014`, `1015`, `1016`, `1018`, `1019`, `1020`, `1021`, `1022`, `1024`, `1025`, `1043`, `1065`, `1069`.

These mismatches are leads for investigation only. They do not establish that every ID is a current playable hero or that missing references indicate missing skills.

## 5. Current Ranged Desk description coverage

| File | Heroes | Skill entries | Empty descriptions |
|---|---:|---:|---:|
| `skills-ranged.json` | 18 | 90 | 0 |
| `skills-leader.json` | 10 | 50 | 0 |
| `skills-infantry.json` | 17 | 85 | 85 |
| `skills-rider.json` | 16 | 80 | 80 |
| `skills-overall.json` | 3 | 15 | 15 |
| **Total** | **64** | **320** | **180** |

## 6. Remaining technical work

1. Parse the Unity serialized objects into structured records, including arrays and nested fields.
2. Reconstruct `StringConfig` chunk/index semantics and the mapping from localization keys to English text.
3. Validate skill group references against `HeroSkillConfig` and `SkillsConfig`.
4. Compare the normalized source records with the existing Ranged Desk JSON data.
5. Keep all inferred relationships separate from confirmed serialized values.

No Ranged Desk application code or existing JSON database has been modified as part of this investigation.
