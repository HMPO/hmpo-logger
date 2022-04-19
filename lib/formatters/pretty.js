const sortObject = require('sort-object-keys');
const util = require('util');
const chalk = require('chalk');

const keys = [
    'clientip',
    'sessionID',
    'hostname',
    'port',
    'method',
    'path',
    'httpversion',
    'response',
    'responseTime',
    'bytes',
    'clientip',
    'sessionID',
    'uniqueID',
    'host',
    'pm',
    'label',
    '@fields',
    'error',
    'stack',
    'type'
];

const levelColors = {
    error: 'redBright',
    warn: 'yellow',
    info: 'green',
    request: 'green',
    outbound: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey'
};

const prettyChalk = new chalk.Instance({level: 1});

module.exports = function (options = {}) {
    return function prettyFormatter(meta) {
        meta = sortObject(meta, keys);

        let timestamp = meta['@timestamp'];
        delete meta['@timestamp'];

        let level = meta.level;
        if (options.colors) {
            const color = levelColors[meta['@level']];
            if (color && prettyChalk[color]) level = prettyChalk[color](level);
        }
        delete meta.level;
        delete meta['@level'];

        const message = meta.message;
        delete meta.message;

        const title = timestamp + ' ' + level + ': ' + message;
        const data = Object.keys(meta).length ? (util.inspect(meta, options).replace(/^\[.*?\] \{/, '').replace(/\n\}$/, '')) : '';
        return title + data;
    };
};

