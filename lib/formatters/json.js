module.exports = function (options = {}) {
    return function JSONFormatter(meta) {
        try {
            return JSON.stringify(meta, null, options.indent || 2 );
        } catch (e) {
            return;
        }
    };
};
