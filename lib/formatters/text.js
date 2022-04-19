module.exports = function () {
    return function textFormatter(meta) {
        return `${meta['@timestamp']} ${meta.level} ${meta.message}`;
    };
};
