const sortObject = require('sort-object-keys');
const interpolate = require('../interpolate');

const keys = [
    '@timestamp',
    'level',
    '@message',
    'message',
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

module.exports = function (options = {}) {
    return function logstashFormatter(meta) {
        meta = sortObject(meta, keys);
        delete meta['@level'];
        const data = interpolate.stringify(meta, options);
        return data;
    };
};

