const Logger = require('./logger');
const moduleName = require('./module-name');
const onFinished = require('on-finished');
const onHeaders = require('on-headers');
const deepCloneMerge = require('deep-clone-merge');
const transports = require('./transports');
const formatters = require('./formatters');
const levels = require('./levels');

/* eslint "no-console":0 */

class Manager {
    constructor() {
        this._loggers = new Map();
        this._transports = new Set();
        this._creator = moduleName.getName(1);
        this._options = deepCloneMerge(Manager.defaultOptions);
    }

    getGlobal() {
        return global.GlobalHmpoLogger || this;
    }

    config(options) {
        if (global.GlobalHmpoLogger) {
            console.warn('Global HMPO Logger already created by ' + global.GlobalHmpoLogger._creator + '. Overwriting loggers.');
        }

        global.GlobalHmpoLogger = this;

        this._options = this._convertConfig(
            deepCloneMerge(
                Manager.defaultOptions,
                options
            )
        );

        // filter metadata
        for (const metaKey in this._options.meta) if (typeof this._options.meta[metaKey] !== 'string') delete this._options.meta[metaKey];
        for (const metaKey in this._options.requestMeta) if (typeof this._options.requestMeta[metaKey] !== 'string') delete this._options.requestMeta[metaKey];

        this._transports.clear();

        for (const transportOptions of this._options.transports) {
            let TransportClass;
            if (transportOptions.className) {
                TransportClass = transports[transportOptions.className];
            } else if (transportOptions.filename) {
                TransportClass = transports.FileTransport;
            } else {
                TransportClass = transports.ConsoleTransport;
            }

            if (!TransportClass) throw new Error('Invalid transport class ' + transportOptions.className);

            const formatter = formatters[transportOptions.formatter || 'text'];
            if (typeof formatter !== 'function') throw new Error('Invalid formatter name ' + transportOptions.formatter);
            transportOptions.formatter = formatter(transportOptions.formatterOptions);
            if (typeof transportOptions.formatter !== 'function') throw new Error('Invalid formatter function ' + transportOptions.formatter);

            const transport = new TransportClass(transportOptions);

            this._transports.add(transport);
        }

        this.rePublicRequests = new RegExp(this._options.publicPattern);
        this.reHealthcheckRequests = new RegExp(this._options.healthcheckPattern);

        if (this._options.handleExceptions && this._transports.size) {
            process.removeListener('uncaughtException', Manager._handleExceptions);
            process.once('uncaughtException', Manager._handleExceptions);
        }

        return this;
    }

    _convertConfig(options) {
        // Handle app and error log being the same file by disabling app logger
        // and only using error logger at the most verbose level of the two
        if (options.app && options.app === options.error) {
            options.app = null;
            const appLevel = levels.indexOf(options.appLevel);
            const errorLevel = levels.indexOf(options.errorLevel);
            if (appLevel > errorLevel) {
                options.errorLevel = options.appLevel;
            }
            options.errorJSON = options.errorJSON || options.appJSON;
            options.errorOptions = Object.assign({}, options.errorOptions, options.appOptions);
        }

        options.transports = options.transports || [];

        if (options.console) {
            options.transports.push(Object.assign({
                name: 'console',
                level: options.consoleLevel,
                formatter: options.consoleJSON ? 'logstash' : 'pretty',
                formatterOptions: { compact: false, colors: options.consoleColor }
            }, options.consoleOptions));
        }

        if (options.app) {
            options.transports.push(Object.assign({
                name: 'app',
                filename: options.app,
                level: options.appLevel,
                dateRotate: options.dateRotate,
                maxFiles: options.dateRotate ? options.maxFiles : undefined,
                formatter: options.appJSON ? 'logstash' : 'text'
            }, options.appOptions));
        }

        if (options.error) {
            options.transports.push(Object.assign({
                name: 'error',
                filename: options.error,
                level: options.errorLevel,
                dateRotate: options.dateRotate,
                maxFiles: options.dateRotate ? options.maxFiles : undefined,
                formatter: options.errorJSON ? 'logstash' : 'text'
            }, options.errorOptions));
        }

        return options;
    }


    static _handleExceptions(err) {
        const manager = global.GlobalHmpoLogger;
        const logger = manager.get(':exception', 3);
        logger.log('fatal', 'Unhandled Exception: :err.message', err, logError => {
            if (logError) {
                console.error('Unhandled exception:', err);
                console.error('Error logging unhandled exception:', logError);
            }
            process.exit(1);
        });
    }

    _logToTransports(meta, callback) {
        let done;
        if (callback) {
            let result = null;
            let todo = this._transports.size;
            done = err => {
                result = result || err;
                todo--;
                if (todo <= 0) callback(result);
            };
        }
        for (const transport of this._transports) transport._log(meta, done);
    }

    get(name, moduleLevel = 1) {
        if (!global.GlobalHmpoLogger && !this.configWarningShown) {
            console.warn('HMPO Logger used before config() was called. Try to config() as ealy as possible.');
            this.configWarningShown = true;
        }

        // use global manager
        const globalManager = this.getGlobal();
        if (globalManager !== this) return globalManager.get(name);

        if (!name) name = moduleName.getName(moduleLevel);

        if (name && name.substr(0, 1) === ':') {
            name = moduleName.getName(moduleLevel) + name;
        }

        if (this._loggers.has(name)) return this._loggers.get(name);

        const logger = new Logger(name, this);
        this._loggers.set(name, logger);

        return logger;
    }

    middleware(name) {
        const options = this.getGlobal()._options;

        name = name || ':express';

        const logger = this.get(name);

        const timeDiff = (from, to) => {
            let ms = (to[0] - from[0]) * 1e3
                + (to[1] - from[1]) * 1e-6;
            return +ms.toFixed(3);
        };

        const handleHeaders = (req, res) => {
            res._startAt = process.hrtime();
            res.responseTime = timeDiff(req._startAt, res._startAt);
        };

        const handleFinished = (req, res) => {
            res._endAt = process.hrtime();
            res.transferTime = timeDiff(res._startAt, res._endAt);
            /* istanbul ignore if */
            if (!res.responseTime) res.responseTime = res.transferTime;

            const url = req.originalUrl || req.url || '';

            if (options.logPublicRequests === false && this.rePublicRequests && url.match(this.rePublicRequests)) {
                return;
            }

            if (options.logHealthcheckRequests === false && this.reHealthcheckRequests && url.match(this.reHealthcheckRequests)) {
                return;
            }

            logger.request(options.format, {
                req: req,
                res: res
            });
        };

        return (req, res, next) => {
            req._startAt = res._startAt = process.hrtime();

            onHeaders(res, () => handleHeaders(req, res));
            onFinished(res, () => handleFinished(req, res));

            next();
        };
    }

    addTransportClass(Class, name = Class.name) {
        transports[name] = Class;
    }

    addFormatter(formatterFactory, name = formatterFactory.name) {
        formatters[name] = formatterFactory;
    }

    get transportClasses() {
        return transports;
    }

}

Manager.defaultOptions = {
    console: true,
    consoleJSON: false,
    consoleColor: true,
    consoleLevel: 'debug',
    appLevel: 'info',
    appJSON: true,
    errorLevel: 'error',
    errorJSON: true,
    meta: {
        host: 'host',
        pm: 'env.pm_id',
        sessionID: 'sessionID',
        method: 'method',
        request: 'request'
    },
    requestMeta: {
        clientip: 'clientip',
        realClientIp: 'realClientIp',
        uniqueID: 'req.x-uniq-id',
        remoteAddress: 'connection.remoteAddress',
        hostname: 'hostname',
        port: 'port',
        response: 'statusCode',
        responseTime: 'responseTime',
        httpversion: 'version',
        bytes: 'res.content-length'
    },
    handleExceptions: true,
    logPublicRequests: false,
    publicPattern: '/public/',
    logHealthcheckRequests: false,
    healthcheckPattern: '^/healthcheck(/|$)',
    dateRotate: false,
    maxFiles: 5,
    format: ':clientip :sessionID :method :request HTTP/:httpVersion :statusCode :res[content-length] - :responseTime ms'
};

module.exports = Manager;
