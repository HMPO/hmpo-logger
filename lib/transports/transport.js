const debug = require('debug')('hmpo:logger:transport');
const levels = require('../levels');

class Transport  {
    constructor(options = {}) {
        this.type = this.constructor.name;
        debug('constructor options', this.type, options);
        this._options = options;
        this.name = this._options.name;
        if (typeof this._options.formatter !== 'function') {
            throw new Error('Invalid formatter specified in options: ' + this.type + ' ' + this.name + ' ' + this._options.formatter);
        }
        this._level = levels.indexOf(this._options.level);
    }

    _log(meta, callback) {
        if (!this.shouldLog(meta)) return callback && callback();
        const text = this._options.formatter(meta);
        this.log(text, meta, callback);
    }

    log(text, meta, callback) {
        if (callback) callback();
    }

    shouldLog(meta) {
        const level = levels.indexOf(meta['@level']);
        return level <= this._level;
    }
}

module.exports = Transport;
