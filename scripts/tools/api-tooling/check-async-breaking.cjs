const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const kleur = require('kleur');

const makeResolver = () => {
  const cache = new Map();
  const loadDoc = ( filePath ) => {
    const abs = path.resolve(filePath);
    if (cache.has(abs)) {
      return cache.get(abs);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const doc = YAML.parse(raw);
    cache.set(abs, doc);
    return doc;
  };
  const resolveRef = ( ref, fromFilePath ) => {
    if ('string' !== typeof ref) {
      return undefined;
    }

    const jsonPointerGet = ( obj, pointer ) => {
      if (!pointer || '' === pointer || '/' === pointer) {
        return obj;
      }

      const parts = pointer.split('/').slice(1).map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
      let cur = obj;
      for (const part of parts) {
        if (null === cur || 'object' !== typeof cur || !(part in cur)) {
          return undefined;
        }
        cur = cur[part];
      }

      return cur;
    };

    if (ref.startsWith('#')) {
      const doc = loadDoc(fromFilePath);
      const pointer = ref.slice(1);
      return jsonPointerGet(doc, pointer);
    }

    const [refPath, frag = ''] = ref.split('#');
    const targetFile = path.resolve(path.dirname(fromFilePath), refPath);
    const doc = loadDoc(targetFile);
    return jsonPointerGet(doc, frag);
  };

  return { resolveRef, loadDoc };
};
const main = () => {
  try {
    const [baseFile, prFile] = process.argv.slice(2);
    if (!baseFile || !prFile) {
      console.error(kleur.red(
        'Usage: node check-async-breaking.js <base-events.yaml> <pr-events.yaml>'
      ));
      process.exit(1);
    }

    const resolver = makeResolver();
    const basePath = path.resolve(baseFile);
    const prPath = path.resolve(prFile);
    const baseSpec = resolver.loadDoc(basePath);
    const prSpec = resolver.loadDoc(prPath);
    const errors = [];

    // Rule 1: cannot delete channels
    const baseChannels = Object.keys((baseSpec.channels || {}));
    const prChannels = Object.keys((prSpec.channels || {}));
    const missingChannels = baseChannels.filter(ch => !prChannels.includes(ch));
    if (missingChannels.length) {
      console.error(kleur.red(`Breaking: removed channels: ${missingChannels.join(', ')}`));
      process.exit(1);
    }

    // Rule 2 + 3: payload $ref must not change, AND required fields must not be removed
    const extractChannelOps = ( spec ) => {
      const channels = spec.channels && 'object' === typeof spec.channels ? spec.channels : {};
      const out = {};
      for (const [chName, ch] of Object.entries(channels)) {
        const ops = {};
        for (const opName of ['publish', 'subscribe']) {
          if (ch && 'object' === typeof ch && ch[opName]) ops[opName] = ch[opName];
        }
        out[chName] = ops;
      }
      return out;
    };
    const resolveMessageObject = ( op, resolver, specFilePath ) => {
      if (!op || 'object' !== typeof op) {
        return null;
      }
      const msg = op.message;
      if (!msg) {
        return null;
      }

      // the message can be {$ref}, or object, or {oneOf: [...]}
      if (msg.$ref) {
        const resolved = resolver.resolveRef(msg.$ref, specFilePath);
        return resolved || null;
      }

      if (Array.isArray(msg.oneOf)) {
        // keep as is; we'll compare payload refs for each variant by index (conservative)
        return msg;
      }
      return msg;
    };
    const extractPayloadRefAndSchema = ( messageObj, resolver, specFilePath ) => {
      if ( !messageObj || 'object' !== typeof messageObj ) {
        return { payloadRef: null, payloadSchema: null };
      }

      // If a message is oneOf, treat each variant separately in the required check, but for payloadRef rule we’ll compare by index.
      if (Array.isArray(messageObj.oneOf)) {
        const variants = messageObj.oneOf.map((v) => {
          const resolvedMsg = v && v.$ref ? resolver.resolveRef(v.$ref, specFilePath) : v;
          return extractPayloadRefAndSchema(resolvedMsg, resolver, specFilePath);
        });
        return { payloadRef: null, payloadSchema: { oneOf: variants.map(x => x.payloadSchema).filter(Boolean) }, variants };
      }

      const payload = messageObj.payload;
      if (!payload) {
        return { payloadRef: null, payloadSchema: null };
      }

      if (payload.$ref) {
        const normalizeRef = ( ref, baseFilePath ) => {
          // Normalize path part so Windows backslashes don't break comparisons
          // Keep fragment (#/...) intact.
          if (!ref.includes('#')) {
            // file-only or internal? internal should start with '#'
            if (ref.startsWith('#')) {
              return ref;
            }

            const abs = path.resolve(path.dirname(baseFilePath), ref);
            return abs.split(path.sep).join('/');
          }
        };
        const payloadRef = normalizeRef(payload.$ref, specFilePath);
        const schema = resolver.resolveRef(payload.$ref, specFilePath);
        return { payloadRef, payloadSchema: schema || null };
      }

      // inline payload schema
      return { payloadRef: null, payloadSchema: payload };
    };
    const compareRequiredDeep = ( baseSchema, prSchema, where, errors ) => {
      const getRequired = (schema) => {
        if (!schema || 'object' !== typeof schema ) {
          return [];
        }
        return Array.isArray(schema.required) ? schema.required : [];
      };
      const getProperties = (schema) => {
        if (!schema || 'object' !== typeof schema) {
          return {};
        }

        return (schema.properties && 'object' === typeof schema.properties) ? schema.properties : {};
      };
      const unwrapSchema = ( schema ) => {
        // Very conservative unwrapping.
        // - allOf: shallow-merge required + properties (the best effort)
        if (!schema || 'object' !== typeof schema ) {
          return schema;
        }

        if (Array.isArray(schema.allOf)) {
          const merged = { ...schema };
          delete merged.allOf;
          const props = {};
          const req = new Set(getRequired(schema));

          for (const part of schema.allOf) {
            const u = unwrapSchema(part);
            const p = getProperties(u);
            for (const [k, v] of Object.entries(p)) {
              props[k] = v;
            }

            for (const r of getRequired(u)) {
              req.add(r);
            }
          }

          if (Object.keys(props).length) {
            merged.properties = { ...(merged.properties || {}), ...props };
          }

          if (req.size) {
            merged.required = Array.from(req);
          }

          return merged;
        }

        return schema;
      };
      const isObjectSchema = ( schema ) => {
        if ( !schema || 'object' !== typeof schema )  {
          return false;
        }
        return 'object' === schema.type || schema.properties || schema.required;
      };

      const base = unwrapSchema(baseSchema);
      const pr = unwrapSchema(prSchema);

      // If base has object-ish schema, PR must still be object-ish (conservative).
      if (isObjectSchema(base) && !isObjectSchema(pr)) {
        errors.push(`Breaking: schema at ${where} changed from object-like to non-object-like`);
        return;
      }

      // Compare the required set at this level
      const bReq = new Set(getRequired(base));
      const pReq = new Set(getRequired(pr));

      for (const required of bReq) {
        if (!pReq.has(required)) {
          errors.push(`Breaking: required field removed at ${where}: "${required}"`);
        }
      }

      // Ensure required props still exist in properties (if properties are declared)
      const bProps = getProperties(base);
      const pProps = getProperties(pr);

      if (Object.keys(bProps).length && Object.keys(pProps).length) {
        for (const required of bReq) {
          if (!(required in pProps)) {
            errors.push(`Breaking: required field "${required}" no longer exists in properties at ${where}`);
          }
        }
      }

      // Recurse into shared properties
      const keys = new Set([...Object.keys(bProps), ...Object.keys(pProps)]);
      for (const key of keys) {
        if (!(key in bProps) || !(key in pProps)) {
          continue;
        }
        compareRequiredDeep(bProps[key], pProps[key], `${where}.properties.${key}`, errors);
      }

      // For oneOf/anyOf we do strictly compare by index if the base has them (conservative).
      for (const kw of ['oneOf', 'anyOf']) {
        if (Array.isArray(base[kw])) {
          if (!Array.isArray(pr[kw]) || pr[kw].length < base[kw].length) {
            errors.push(`Breaking: ${kw} at ${where} changed (missing or fewer variants)`);
            continue;
          }

          for (let i = 0; i < base[kw].length; i++) {
            compareRequiredDeep(base[kw][i], pr[kw][i], `${where}.${kw}[${i}]`, errors);
          }
        }
      }
    };

    const baseOpsByChannel = extractChannelOps(baseSpec);
    const prOpsByChannel = extractChannelOps(prSpec);

    for (const ch of baseChannels) {
      const baseOps = baseOpsByChannel[ch] || {};
      const prOps = prOpsByChannel[ch] || {};

      for (const opName of Object.keys(baseOps)) {
        const baseOp = baseOps[opName];
        const prOp = prOps[opName];
        const where = `channels.${ch}.${opName}`;
        if (!prOp) {
          // Removing publish/subscribe op is also breaking in practice
          errors.push(`Breaking: removed operation ${where}`);
          continue;
        }

        const baseMsgObj = resolveMessageObject(baseOp, resolver, basePath);
        const prMsgObj = resolveMessageObject(prOp, resolver, prPath);
        const basePayload = extractPayloadRefAndSchema(baseMsgObj, resolver, basePath);
        const prPayload = extractPayloadRefAndSchema(prMsgObj, resolver, prPath);

        // Rule 2: if the base payload uses $ref, PR must use the same normalized $ref
        if (basePayload.payloadRef) {
          if (!prPayload.payloadRef) {
            errors.push(`Breaking: payload ref removed/changed at ${where} (was ref, now inline or missing)`);
          } else if (basePayload.payloadRef !== prPayload.payloadRef) {
            errors.push(`Breaking: payload $ref changed at ${where}\n  base: ${basePayload.payloadRef}\n  pr:   ${prPayload.payloadRef}`);
          }
        }

        // Rule 3: required fields cannot be removed (deep, best-effort)
        if (basePayload.payloadSchema && prPayload.payloadSchema) {
          compareRequiredDeep(basePayload.payloadSchema, prPayload.payloadSchema, `${where}.message.payload`, errors);
        }

      }
    }

    if (errors.length) {
      console.error(kleur.red(errors.join('\n')));
      process.exit(1);
    }

    console.log(kleur.green('AsyncAPI breaking-change check passed.'));
  } catch (e) {
    console.error(kleur.red( e.message ));
    process.exit(1);
  }
};

main();
