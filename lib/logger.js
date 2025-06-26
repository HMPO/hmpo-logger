const os = require('os');
const interpolate = require('./interpolate');
const levels = require('./levels');
const TokenFn = interpolate.TokenFn;

class Logger {
    constructor(name, manager) {
        this._name = name || 'Unknown';
        this._manager = manager;
        this.addMethods();
    }

    addMethods() {
        for (const name of levels) {
            this[name] = (...args) => this.log(name, ...args);
        }
    }

    static reToken() {
        return /(%)[sdfu]|:([a-z0-9._-]+)(\[([a-z0-9_-]+)\])?/ig;
    }

    _addMetaData(dest, definitions, tokenSources) {
        for (const name in definitions) {
            let val = interpolate.getTokenValue(tokenSources, definitions[name], dest);
            val = interpolate.cleanValue(val);
            if (val !== undefined) {
                dest[name] = val;
            }
        }
    }

    trimHtml(body, maxLength) {
        const reHtmlTitle = /<title>([\s\S]+?)<\/title>/i;
        const reHtmlBody = /<body[\s\S]+$/i;
        const reWhitespace = /\s+/g;
        const reHtmlScript = /(<script[\s\S]+?<\/script>)/gi;
        const reHtmlTag = /(<[^>]+>)+/g;

        if (typeof body !== 'string') { return body; }
        maxLength = maxLength || 400;

        let text = [];
        const hmtlTitle = body.match(reHtmlTitle);
        if (hmtlTitle) {
            text.push(hmtlTitle[1]
                .replace(reWhitespace, ' ')
                .trim());
        }

        const htmlBody = body.match(reHtmlBody);
        if (htmlBody) {
            text.push(htmlBody[0]
                .replace(reHtmlScript, ' ')
                .replace(reHtmlTag, ' ')
                .replace(reWhitespace, ' ')
                .trim());
        }

        text = text.length ? text.join(': ') : body;

        if (text.length > maxLength) {
            text = text.substr(0, maxLength - 3) + '...';
        }

        return text;
    }

    log(...args) {
        const options = this._manager._options;

        let callback;
        if (typeof args[args.length - 1] === 'function') {
            callback = args.pop();
        }

        const meta = {};
        if (typeof args[args.length - 1] === 'object') {
            let newMeta = args.pop();
            if (newMeta instanceof Error) {
                meta.err = newMeta;
            } else {
                Object.assign(meta, newMeta);
            }
        }

        const level = (args.length > 1 ? args.shift() : 'debug').toLowerCase();

        const msg = args.shift() || '';

        // if the req or res refer to eachother use those
        if (!meta.req && meta.res) {
            meta.req = meta.res.req;
        }
        if (!meta.res && meta.req) {
            meta.res = meta.req.res;
        }

        // tokens are searched in this order:
        const tokens = [
            Logger.tokens,
            meta.req,
            meta.res,
            meta
        ];

        // add general meta as specified in config
        if (options.meta) {
            this._addMetaData(meta, options.meta, tokens);
        }

        // add request specific meta
        if (options.requestMeta && level === 'request') {
            this._addMetaData(meta, options.requestMeta, tokens);
        }

        // interpolate tokens in msg
        meta.message = msg && msg.replace(Logger.reToken(), function (match, param, key, hasArg, arg) {
            const val = param ? args.shift() : interpolate.getTokenValue(tokens, [key, arg], meta);
            return val !== undefined ? interpolate.cleanValue(val) : '-';
        });

        // convert error into meta
        if (meta.err instanceof Error) {
            if (!meta.message) meta.message = meta.err.message;
            meta.stack = typeof meta.err.stack === 'string' && meta.err.stack.split(/[\n\r]+/);
            if (!meta.original && meta.err.original) meta.original = meta.err.original;
            for (const errorKey in meta.err) {
                if (typeof meta.err[errorKey] !== 'object' && meta[errorKey] === undefined) {
                    meta[errorKey] = interpolate.cleanValue(meta.err[errorKey]);
                }
            }

            delete meta.err;
        }

        // add time, label and level
        meta['@timestamp'] = new Date().toISOString();
        meta['@level'] = level;
        meta.label = this._name;
        meta.level = level.toUpperCase();

        // remove req and res from meta to be logged
        delete meta.req;
        delete meta.res;

        this._manager._logToTransports(meta, callback);
    }
}

Logger.tokens = {

    host: os.hostname(),

    pid: process.pid,

    env: new TokenFn(function (arg) {
        return process.env[arg];
    }),

    txt: new TokenFn(function (...args) {
        return args.join('.');
    }),

    res: new TokenFn(function (arg) {
        if (!arg || !this.res || !this.res.getHeader) { return; }

        const header = this.res.getHeader(arg);
        return Array.isArray(header) ? header.join(', ') : header;
    }),

    req: new TokenFn(function (arg) {
        if (!arg || !this.req || !this.req.headers) { return; }

        const header = this.req.headers[arg.toLowerCase()];
        return Array.isArray(header) ? header.join(', ') : header;
    }),

    realClientIp: new TokenFn(function () {
        if (!this.req) { return; }

        console.log('This should be the real-client-ip (might not appear locally): ' + this.req.get('x-real-client-ip'));
        console.log('This should be forwarded-for (might not appear locally): ' + this.req.get('x-forwarded-for'));
        console.log('This should be Host (should ALWAYS appear): ' + this.req.get('host'));
        console.log('This should be all headers: ' + this.req.headers);

        return this.req.headers['x-real-client-ip']; // This is temporary because the other 2 headers don't get set when running locally
    }),

    clientip: new TokenFn(function () {
        if (!this.req) { return; }
        return this.req.ip || (this.req.connection && this.req.connection.remoteAddress);
    }),

    request: new TokenFn(function () {
        if (!this.req) { return; }
        return this.req.originalUrl || this.req.url;
    }),

    strippedRequest: new TokenFn(function () {
        if (!this.req) { return; }
        let url = this.req.originalUrl || this.req.url;
        if (typeof url === 'string') {
            url = url.split('?')[0];
        }
        return url;
    }),

    httpVersion: new TokenFn(function () {
        if (!this.req || !this.req.httpVersionMajor || !this.req.httpVersionMinor) { return; }
        return this.req.httpVersionMajor + '.' + this.req.httpVersionMinor;
    })

};

module.exports = Logger;
