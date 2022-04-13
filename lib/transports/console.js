const Transport = require('./transport');
const os = require('os');
const levels = require('../levels');

class ConsoleTransport extends Transport {
    constructor(...args) {
        super(...args);
        this._eol = this._options.eol || os.EOL;
        this._errorLevel = levels.indexOf('error');
        this._warnLevel = levels.indexOf('warn');
        this._stdout = console._stdout;
        this._stderr = console._stderr;
    }

    log(text, meta, callback) {
        const logLevel = levels.indexOf(meta['@level']);

        if (this._stderr && logLevel <= this._warnLevel) {
            return this._stderr.write(text + this._eol, callback);
        }

        if (this._stdout) {
            return this._stdout.write(text + this._eol, callback);
        }

        if (logLevel <= this._errorLevel) {
            console.error(text);
        } else if (logLevel <= this._warnLevel) {
            console.warn(text);
        } else {
            console.log(text);
        }

        if (callback) callback();
    }
}

module.exports = ConsoleTransport;
