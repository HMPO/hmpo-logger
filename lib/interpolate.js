const debug = require('debug')('hmpo:logger:interpolate');

const interpolate = {};

interpolate.cleanValue = function (val, { maxLength = 200, isoDates = true} = {}) {
    if (typeof val === 'number') { return (isoDates && val >= 31536000000 && val < 3187296000000) ? new Date(val).toISOString() : val; }
    if (typeof val === 'boolean') { return val; }
    if (typeof val === 'string') { return val.length <= maxLength ? val : val.substring(0, maxLength) + '...'; }
    if (val instanceof Date) { return isoDates ? new Date(val).toISOString() : val; }
    if (val === null) { return null; }
    if (typeof val === 'object') { return interpolate.cleanValue(interpolate.stringify(val, { maxLength }), { maxLength }); }
    return undefined;
};

interpolate.stringify = function (obj, {maxLength, maxObjects = 10, circular = '[circular]', indent} = {}) {
    const circularegister = new Set;
    let objectCount = 0;
    const replacer = (k, v) => {
        if (typeof v === 'object' && maxObjects) {
            objectCount++;
            if (objectCount > maxObjects) return '[object ' + (v.constructor && v.constructor.name) + ']';
        }
        if (typeof v === 'object' && circular) {
            if (circularegister.has(v)) return circular;
            circularegister.add(v);
        }
        if (typeof v === 'string' && maxLength) {
            if (v.length > maxLength) return v.substring(0, maxLength) + '...';
        }
        return v;
    };
    try {
        return JSON.stringify(obj, replacer, indent);
    } catch {
        return;
    }
};

interpolate.getTokenValue = function (sources, key, context) {
    if (!Array.isArray(sources)) sources = [ sources ];
    if (Array.isArray(key)) key = key.filter(v => v).join('.');
    if (!key) return;

    let bestValue;

    for (const source of sources) {
        if (!source || !Object.keys(source).length) continue;

        let val = source;
        const parts = key.split('.');

        while (parts.length && val && typeof val === 'object' && val) {
            const part = parts.shift();
            val = val[part];
            if (val instanceof interpolate.TokenFn) {
                val = val.fn.apply(context, parts);
                debug('tokenFn:', key, val);
                return val;
            }
        }

        if (!parts.length && (typeof val === 'number' || typeof val === 'string' || val === null || val instanceof Date)) {
            debug('tokenVal:', key, val);
            bestValue = val;
            if (val !== null) return val;
        }
    }

    debug('best val:', key, bestValue);
    return bestValue;
};


interpolate.TokenFn = class TokenFn {
    constructor(fn) {
        this.fn = fn;
    }
};


module.exports = interpolate;
