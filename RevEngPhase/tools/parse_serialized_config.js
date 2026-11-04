/*
 * Read the selected UnityFS config bundles from the copied game data.
 * This analysis utility only reads DoomsdayData and writes under RevEngPhase.
 * No application or application database files are touched.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const SOURCE_DIR = path.join(ROOT, "DoomsdayData", "data");
const DECOMPRESSED_DIR = path.join(
  ROOT,
  "RevEngPhase",
  "artifacts",
  "decompressed",
);
const OUTPUT_DIR = path.join(ROOT, "RevEngPhase", "artifacts", "parsed");

const INPUTS = [
  ["gameconfig_string_en_269349052.ab", "gameconfig_string_en_269349052.ab.bin"],
  [
    "gameconfig_skills_group_3930170623.ab",
    "gameconfig_skills_group_3930170623.ab.bin",
  ],
  ["gameconfig_skills_1046730706.ab", "gameconfig_skills_1046730706.ab.bin"],
  [
    "gameconfig_skill_status_694894448.ab",
    "gameconfig_skill_status_694894448.ab.bin",
  ],
  [
    "gameconfig_skill_global_1185550054.ab",
    "gameconfig_skill_global_1185550054.ab.bin",
  ],
  ["gameconfig_hero_skill_1938798020.ab", "hero_skill_bundle_data.bin"],
];

const COMMON_STRINGS = new Map(
  Object.entries({
    0: "AABB",
    5: "AnimationClip",
    19: "AnimationCurve",
    34: "AnimationState",
    49: "Array",
    55: "Base",
    60: "BitField",
    69: "bitset",
    76: "bool",
    81: "char",
    86: "ColorRGBA",
    96: "Component",
    106: "data",
    111: "deque",
    117: "double",
    124: "dynamic_array",
    138: "FastPropertyName",
    155: "first",
    161: "float",
    167: "Font",
    172: "GameObject",
    183: "Generic Mono",
    196: "GradientNEW",
    208: "GUID",
    213: "GUIStyle",
    222: "int",
    226: "list",
    231: "long long",
    241: "map",
    245: "Matrix4x4f",
    256: "MdFour",
    263: "MonoBehaviour",
    277: "MonoScript",
    288: "m_ByteSize",
    299: "m_Curve",
    307: "m_EditorClassIdentifier",
    331: "m_EditorHideFlags",
    349: "m_Enabled",
    359: "m_ExtensionPtr",
    374: "m_GameObject",
    387: "m_Index",
    395: "m_IsArray",
    405: "m_IsStatic",
    416: "m_MetaFlag",
    427: "m_Name",
    434: "m_ObjectHideFlags",
    452: "m_PrefabInternal",
    469: "m_PrefabParentObject",
    490: "m_Script",
    499: "m_StaticEditorFlags",
    519: "m_Type",
    526: "m_Version",
    536: "Object",
    543: "pair",
    548: "PPtr<Component>",
    564: "PPtr<GameObject>",
    581: "PPtr<Material>",
    596: "PPtr<MonoBehaviour>",
    616: "PPtr<MonoScript>",
    633: "PPtr<Object>",
    646: "PPtr<Prefab>",
    659: "PPtr<Sprite>",
    672: "PPtr<TextAsset>",
    688: "PPtr<Texture>",
    702: "PPtr<Texture2D>",
    718: "PPtr<Transform>",
    734: "Prefab",
    741: "Quaternionf",
    753: "Rectf",
    759: "RectInt",
    767: "RectOffset",
    778: "second",
    785: "set",
    789: "short",
    795: "size",
    800: "SInt16",
    807: "SInt32",
    814: "SInt64",
    821: "SInt8",
    827: "staticvector",
    840: "string",
    847: "TextAsset",
    857: "TextMesh",
    866: "Texture",
    874: "Texture2D",
    884: "Transform",
    894: "TypelessData",
    907: "UInt16",
    914: "UInt32",
    921: "UInt64",
    928: "UInt8",
    934: "unsigned int",
    947: "unsigned long long",
    966: "unsigned short",
    981: "vector",
    988: "Vector2f",
    997: "Vector3f",
    1006: "Vector4f",
    1015: "m_ScriptingClassIdentifier",
    1042: "Gradient",
    1051: "Type*",
    1057: "int2_storage",
    1070: "int3_storage",
    1083: "BoundsInt",
    1093: "m_CorrespondingSourceObject",
    1121: "m_PrefabInstance",
    1138: "m_PrefabAsset",
    1152: "FileSize",
    1161: "Hash128",
    1169: "RenderingLayerMask",
    1188: "fixed_array",
    1200: "EntityId",
    1209: "LoadableObjectId",
    1226: "LoadableSceneId",
  }).map(([offset, value]) => [Number(offset), value]),
);

function readLz4Block(input, expectedSize) {
  const output = Buffer.alloc(expectedSize);
  let inputOffset = 0;
  let outputOffset = 0;

  while (inputOffset < input.length) {
    const token = input[inputOffset++];
    let literalLength = token >> 4;

    if (literalLength === 15) {
      let extension;
      do {
        if (inputOffset >= input.length) throw new Error("Truncated LZ4 literal length");
        extension = input[inputOffset++];
        literalLength += extension;
      } while (extension === 255);
    }

    if (
      inputOffset + literalLength > input.length ||
      outputOffset + literalLength > output.length
    ) {
      throw new Error("Invalid LZ4 literal range");
    }

    input.copy(output, outputOffset, inputOffset, inputOffset + literalLength);
    inputOffset += literalLength;
    outputOffset += literalLength;
    if (inputOffset === input.length) break;

    if (inputOffset + 2 > input.length) throw new Error("Truncated LZ4 match offset");
    const distance = input[inputOffset] | (input[inputOffset + 1] << 8);
    inputOffset += 2;

    let matchLength = (token & 0x0f) + 4;
    if ((token & 0x0f) === 15) {
      let extension;
      do {
        if (inputOffset >= input.length) throw new Error("Truncated LZ4 match length");
        extension = input[inputOffset++];
        matchLength += extension;
      } while (extension === 255);
    }

    if (
      distance === 0 ||
      distance > outputOffset ||
      outputOffset + matchLength > output.length
    ) {
      throw new Error("Invalid LZ4 match range");
    }

    for (let i = 0; i < matchLength; i++) {
      output[outputOffset + i] = output[outputOffset - distance + i];
    }
    outputOffset += matchLength;
  }

  if (outputOffset !== expectedSize) {
    throw new Error(`LZ4 output size ${outputOffset}; expected ${expectedSize}`);
  }
  return output;
}

function extractUnityFsNode(bundle, filename) {
  let offset = 8;
  const format = bundle.readUInt32BE(offset);
  offset += 4;

  const readCString = () => {
    const end = bundle.indexOf(0, offset);
    if (end < 0) throw new Error(`${filename}: unterminated UnityFS string`);
    const value = bundle.subarray(offset, end).toString("utf8");
    offset = end + 1;
    return value;
  };

  const playerVersion = readCString();
  const engineVersion = readCString();
  const declaredBundleSize = Number(bundle.readBigUInt64BE(offset));
  offset += 8;
  const compressedInfoSize = bundle.readUInt32BE(offset);
  offset += 4;
  const uncompressedInfoSize = bundle.readUInt32BE(offset);
  offset += 4;
  const archiveFlags = bundle.readUInt32BE(offset);
  offset += 4;

  if (bundle.subarray(0, 7).toString("ascii") !== "UnityFS") {
    throw new Error(`${filename}: not a UnityFS bundle`);
  }
  if (format < 7 || declaredBundleSize !== bundle.length) {
    throw new Error(`${filename}: unsupported or inconsistent UnityFS header`);
  }
  if (!engineVersion.startsWith("2022.3.62")) {
    throw new Error(`${filename}: unexpected Unity engine ${engineVersion}`);
  }

  // Unity 2022.3 aligns the header and uses bit 0x200 to align the data blocks.
  offset = (offset + 15) & ~15;
  const infoOffset = archiveFlags & 0x80 ? bundle.length - compressedInfoSize : offset;
  const infoSource = bundle.subarray(infoOffset, infoOffset + compressedInfoSize);
  const infoCompression = archiveFlags & 0x3f;
  const info = infoCompression === 0
    ? infoSource
    : readLz4Block(infoSource, uncompressedInfoSize);

  let cursor = 16;
  const blockCount = info.readUInt32BE(cursor);
  cursor += 4;
  const blocks = [];
  for (let i = 0; i < blockCount; i++) {
    blocks.push({
      uncompressedSize: info.readUInt32BE(cursor),
      compressedSize: info.readUInt32BE(cursor + 4),
      flags: info.readUInt16BE(cursor + 8),
    });
    cursor += 10;
  }

  const nodeCount = info.readUInt32BE(cursor);
  cursor += 4;
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const nodeOffset = Number(info.readBigUInt64BE(cursor));
    cursor += 8;
    const nodeSize = Number(info.readBigUInt64BE(cursor));
    cursor += 8;
    const flags = info.readUInt32BE(cursor);
    cursor += 4;
    const end = info.indexOf(0, cursor);
    if (end < 0) throw new Error(`${filename}: unterminated node path`);
    const nodePath = info.subarray(cursor, end).toString("utf8");
    cursor = end + 1;
    nodes.push({ offset: nodeOffset, size: nodeSize, flags: flags, path: nodePath });
  }
  if (cursor !== info.length) throw new Error(`${filename}: trailing UnityFS block info`);

  let dataOffset = archiveFlags & 0x80 ? offset : infoOffset + compressedInfoSize;
  if (archiveFlags & 0x200) dataOffset = (dataOffset + 15) & ~15;
  const dataBlocks = [];
  for (const block of blocks) {
    const compressed = bundle.subarray(dataOffset, dataOffset + block.compressedSize);
    if (compressed.length !== block.compressedSize) {
      throw new Error(`${filename}: truncated data block`);
    }
    const compression = block.flags & 0x3f;
    dataBlocks.push(
      compression === 0
        ? compressed
        : readLz4Block(compressed, block.uncompressedSize),
    );
    dataOffset += block.compressedSize;
  }

  if (nodes.length !== 1) {
    throw new Error(`${filename}: expected one serialized node, found ${nodes.length}`);
  }
  const data = Buffer.concat(dataBlocks);
  const node = nodes[0];
  return {
    bytes: data.subarray(node.offset, node.offset + node.size),
    metadata: {
      format,
      playerVersion,
      engineVersion,
      archiveFlags,
      serializedNode: node.path,
      blockCount,
    },
  };
}

function parseSerializedFile(bytes) {
  let offset = 48;
  const header = {
    version: bytes.readUInt32BE(8),
    metadataSize: bytes.readUInt32BE(20),
    fileSize: Number(bytes.readBigUInt64BE(24)),
    dataOffset: Number(bytes.readBigUInt64BE(32)),
    unknown: Number(bytes.readBigUInt64BE(40)),
  };
  const readCString = () => {
    const end = bytes.indexOf(0, offset);
    if (end < 0) throw new Error("Unterminated SerializedFile string");
    const value = bytes.subarray(offset, end).toString("utf8");
    offset = end + 1;
    return value;
  };
  const readInt32 = () => {
    const value = bytes.readInt32LE(offset);
    offset += 4;
    return value;
  };
  const readUInt32 = () => {
    const value = bytes.readUInt32LE(offset);
    offset += 4;
    return value;
  };

  const unityVersion = readCString();
  const targetPlatform = readInt32();
  const typeTreeEnabled = Boolean(bytes[offset++]);
  const typeCount = readInt32();
  const types = [];

  for (let typeIndex = 0; typeIndex < typeCount; typeIndex++) {
    const classId = readInt32();
    const isStripped = Boolean(bytes[offset++]);
    const scriptTypeIndex = bytes.readInt16LE(offset);
    offset += 2;
    let scriptId = null;
    if (classId === 114) {
      scriptId = bytes.subarray(offset, offset + 16).toString("hex");
      offset += 16;
    }
    const oldTypeHash = bytes.subarray(offset, offset + 16).toString("hex");
    offset += 16;

    const nodeCount = readInt32();
    const stringBufferSize = readInt32();
    const flatNodes = [];
    for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex++) {
      offset += 2; // TypeTree node version
      const level = bytes[offset++];
      offset++; // TypeTree node flags
      const typeOffset = readUInt32();
      const nameOffset = readUInt32();
      const byteSize = readInt32();
      const index = readInt32();
      const metaFlags = readInt32();
      offset += 8; // Reference type hash
      flatNodes.push({ level, typeOffset, nameOffset, byteSize, index, metaFlags });
    }

    const stringBuffer = bytes.subarray(offset, offset + stringBufferSize);
    offset += stringBufferSize;
    const resolveString = (stringOffset) => {
      const valueOffset = stringOffset & 0x7fffffff;
      if (stringOffset & 0x80000000) {
        return COMMON_STRINGS.get(valueOffset) || `CommonString@${valueOffset}`;
      }
      const end = stringBuffer.indexOf(0, valueOffset);
      return stringBuffer
        .subarray(valueOffset, end < 0 ? stringBuffer.length : end)
        .toString("utf8");
    };

    const nodes = flatNodes.map((node) => ({
      ...node,
      type: resolveString(node.typeOffset),
      name: resolveString(node.nameOffset),
      children: [],
    }));
    const stack = [];
    let root = null;
    for (const node of nodes) {
      while (stack.length > node.level) stack.pop();
      if (stack.length) stack[stack.length - 1].children.push(node);
      else root = node;
      stack.push(node);
    }

    const dependencyCount = readInt32();
    const dependencies = [];
    for (let i = 0; i < dependencyCount; i++) dependencies.push(readInt32());
    types.push({
      classId,
      isStripped,
      scriptTypeIndex,
      scriptId,
      oldTypeHash,
      dependencies,
      root,
    });
  }

  const objectCount = readInt32();
  const objects = [];
  for (let i = 0; i < objectCount; i++) {
    offset = (offset + 3) & ~3;
    const pathId = bytes.readBigInt64LE(offset).toString();
    offset += 8;
    const byteStart = Number(bytes.readBigInt64LE(offset));
    offset += 8;
    const byteSize = readUInt32();
    const typeId = readInt32();
    objects.push({
      pathId,
      byteStart,
      byteSize,
      typeId,
      classId: types[typeId].classId,
    });
  }

  return {
    header,
    unityVersion,
    targetPlatform,
    typeTreeEnabled,
    types,
    objects,
  };
}

class BinaryReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.offset = 0;
  }

  read(size) {
    if (size < 0 || this.offset + size > this.bytes.length) {
      throw new Error(`Read out of bounds at ${this.offset} (size ${size})`);
    }
    const value = this.bytes.subarray(this.offset, this.offset + size);
    this.offset += size;
    return value;
  }

  align4() {
    this.offset = (this.offset + 3) & ~3;
  }

  readPrimitive(type) {
    const at = this.offset;
    switch (type) {
      case "int":
      case "SInt32":
        this.offset += 4;
        return this.bytes.readInt32LE(at);
      case "unsigned int":
      case "UInt32":
        this.offset += 4;
        return this.bytes.readUInt32LE(at);
      case "short":
      case "SInt16":
        this.offset += 2;
        return this.bytes.readInt16LE(at);
      case "unsigned short":
      case "UInt16":
        this.offset += 2;
        return this.bytes.readUInt16LE(at);
      case "SInt64":
      case "long long":
        this.offset += 8;
        return this.bytes.readBigInt64LE(at).toString();
      case "unsigned long long":
      case "UInt64":
        this.offset += 8;
        return this.bytes.readBigUInt64LE(at).toString();
      case "float":
        this.offset += 4;
        return this.bytes.readFloatLE(at);
      case "double":
        this.offset += 8;
        return this.bytes.readDoubleLE(at);
      case "bool":
        this.offset++;
        return Boolean(this.bytes.readUInt8(at));
      case "char":
      case "UInt8":
      case "SInt8":
        this.offset++;
        return this.bytes.readUInt8(at);
      default:
        throw new Error(`Unsupported TypeTree primitive: ${type}`);
    }
  }
}

function decodeNode(node, reader) {
  let value;

  if (node.type === "string") {
    const byteLength = reader.readPrimitive("int");
    if (byteLength < 0 || byteLength > 20_000_000) {
      throw new Error(`Invalid string size ${byteLength} at ${node.name}`);
    }
    value = reader.read(byteLength).toString("utf8");
    if (node.children[0]?.metaFlags & 0x4000) reader.align4();
  } else if (node.type === "Array") {
    const sizeNode = node.children.find((child) => child.name === "size");
    const dataNode = node.children.find((child) => child.name === "data");
    if (!sizeNode || !dataNode) throw new Error(`Invalid array node: ${node.name}`);
    const count = reader.readPrimitive(sizeNode.type);
    if (count < 0 || count > 2_000_000) {
      throw new Error(`Invalid array length ${count} at ${node.name}`);
    }
    value = Array.from({ length: count }, () => decodeNode(dataNode, reader));
    if (node.metaFlags & 0x4000) reader.align4();
  } else if (node.type === "vector" || node.type === "map") {
    const arrayNode = node.children.find((child) => child.type === "Array");
    if (!arrayNode) throw new Error(`Missing Array child at ${node.name}`);
    value = decodeNode(arrayNode, reader);
  } else if (node.type === "TypelessData") {
    const byteLength = reader.readPrimitive("int");
    value = reader.read(byteLength).toString("hex");
  } else if (node.children.length) {
    value = {};
    for (const child of node.children) value[child.name] = decodeNode(child, reader);
  } else {
    value = reader.readPrimitive(node.type);
  }

  if (node.metaFlags & 0x4000) reader.align4();
  return value;
}

function parseOne(sourceName, decompressedName) {
  const sourcePath = path.join(SOURCE_DIR, sourceName);
  const binaryPath = path.join(DECOMPRESSED_DIR, decompressedName);
  const sourceBytes = fs.readFileSync(sourcePath);
  const serializedBytes = fs.readFileSync(binaryPath);
  const serialized = parseSerializedFile(serializedBytes);
  const objectReaders = new Map();

  for (const object of serialized.objects) {
    const start = serialized.header.dataOffset + object.byteStart;
    const objectBytes = serializedBytes.subarray(start, start + object.byteSize);
    const reader = new BinaryReader(objectBytes);
    const tree = serialized.types[object.typeId].root;
    const value = decodeNode(tree, reader);
    if (reader.offset !== object.byteSize) {
      throw new Error(`${sourceName}: object ${object.pathId} did not fully decode`);
    }
    objectReaders.set(object.pathId, { object, value });
  }

  const monoBehaviourEntry = [...objectReaders.values()].find(
    ({ object }) => object.classId === 114,
  );
  if (!monoBehaviourEntry) throw new Error(`${sourceName}: no MonoBehaviour object`);

  const scriptPathId = monoBehaviourEntry.value.m_Script.m_PathID;
  const script = objectReaders.get(scriptPathId)?.value;
  const data = monoBehaviourEntry.value;
  const className = script?.m_ClassName || data.Data?.constructor?.name || "UnknownConfig";
  const records = Array.isArray(data.Data?.Array) ? data.Data.Array : null;

  return {
    source: {
      bundle: sourceName,
      bundleBytes: sourceBytes.length,
      bundleSha256: crypto.createHash("sha256").update(sourceBytes).digest("hex"),
      serializedFile: decompressedName,
      serializedBytes: serializedBytes.length,
      serializedSha256: crypto
        .createHash("sha256")
        .update(serializedBytes)
        .digest("hex"),
      unityVersion: serialized.unityVersion,
      serializedFormatVersion: serialized.header.version,
      targetPlatform: serialized.targetPlatform,
      dataOffset: serialized.header.dataOffset,
      mainObjectPathId: monoBehaviourEntry.object.pathId,
      scriptClass: script?.m_ClassName || null,
      scriptNamespace: script?.m_Namespace || null,
      scriptAssembly: script?.m_AssemblyName || null,
    },
    recordCount: records?.length ?? null,
    data,
  };
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
for (const [sourceName, decompressedName] of INPUTS) {
  const parsed = parseOne(sourceName, decompressedName);
  const outputName = `${path.basename(sourceName, ".ab")}.parsed.json`;
  const outputPath = path.join(OUTPUT_DIR, outputName);
  fs.writeFileSync(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  console.log(
    `${outputName}\t${parsed.source.scriptNamespace}.${parsed.source.scriptClass}\t${parsed.recordCount ?? "-"} records`,
  );
}
