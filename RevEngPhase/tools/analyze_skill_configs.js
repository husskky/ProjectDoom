const fs = require("node:fs");
const path = require("node:path");

const parsedDir = path.resolve(__dirname, "..", "artifacts", "parsed");
const load = (name) => JSON.parse(
  fs.readFileSync(path.join(parsedDir, `${name}.parsed.json`), "utf8"),
).data;
const records = (config) => config.Data.Array;
const uniqueCount = (items) => new Set(items).size;

const heroSkill = records(load("gameconfig_hero_skill_1938798020"));
const groups = records(load("gameconfig_skills_group_3930170623"));
const skills = records(load("gameconfig_skills_1046730706"));
const statuses = records(load("gameconfig_skill_status_694894448"));
const strings = records(load("gameconfig_string_en_269349052"));

const groupIds = new Set(groups.map(({ Id }) => Id));
const skillIds = new Set(skills.map(({ Id }) => Id));
const statusIds = new Set(statuses.map(({ Id }) => Id));
const heroGroupMissing = heroSkill.filter(
  ({ SkillsGroupId }) => !groupIds.has(SkillsGroupId),
);
const groupSkillRefs = groups.flatMap(({ Skills = [] }) => Skills);
const groupStatusRefs = groups
  .map(({ SkillStatus }) => SkillStatus)
  .filter(Boolean);

const summary = {
  recordCounts: {
    heroSkill: heroSkill.length,
    skillsGroup: groups.length,
    skills: skills.length,
    skillStatus: statuses.length,
    stringEn: strings.length,
  },
  uniqueIds: {
    heroSkillGroupReferences: uniqueCount(
      heroSkill.map(({ SkillsGroupId }) => SkillsGroupId),
    ),
    skillsGroup: uniqueCount(groups.map(({ Id }) => Id)),
    skills: uniqueCount(skills.map(({ Id }) => Id)),
    skillStatus: uniqueCount(statuses.map(({ Id }) => Id)),
    stringEn: uniqueCount(strings.map(({ Id }) => Id)),
  },
  heroToGroup: {
    records: heroSkill.length,
    validGroupReferences: heroSkill.length - heroGroupMissing.length,
    missingGroupReferences: heroGroupMissing.length,
    missingExamples: heroGroupMissing.slice(0, 10),
    distinctGroupIds: uniqueCount(heroSkill.map(({ SkillsGroupId }) => SkillsGroupId)),
  },
  groupToSkills: {
    referenceSlots: groupSkillRefs.length,
    distinctSkillIds: uniqueCount(groupSkillRefs),
    missingSkillIds: [...new Set(groupSkillRefs.filter((id) => !skillIds.has(id)))],
  },
  groupToStatus: {
    nonzeroReferences: groupStatusRefs.length,
    distinctStatusIds: uniqueCount(groupStatusRefs),
    missingStatusIds: [...new Set(groupStatusRefs.filter((id) => !statusIds.has(id)))],
  },
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
