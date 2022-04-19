const debug = require('debug')('hmpo:logger:transport:file');
const StreamTransport = require('./stream');

const path = require('path');
const fs = require('fs');
const glob = require('glob');


class FileTransport extends StreamTransport {
    constructor(...args) {
        super(...args);

        this._dateRotateGlob = glob;
        this._filename = path.resolve(this._options.filename);
        this._dirname = path.dirname(this._filename);
        this._extname = path.extname(this._filename);
        this._basename = path.basename(this._filename, this._extname);

        if (this._options.dateRotate) {
            const logfileDate = this._getLogfileDate();
            this._dateRotateUpdateDay(logfileDate);
        }
    }

    _log(...args) {
        if (this._stream && this._needsDateRotate()) this._close();
        super._log(...args);
    }

    open(callback) {
        debug('File open');
        if (this._needsDateRotate()) {
            return this._dateRotateLog(() => {
                this._createStream(callback);
                this._removeOldFiles();
            });
        }

        this._createStream(callback);
    }

    _createStream(callback) {
        debug('Creating new log stream');
        const stream = fs.createWriteStream(this._filename, { flags: 'a', mode: this._options.fileMode });
        const done = (...args) => {
            if (callback) callback(...args);
            callback = null;
        };
        stream.once('open', () => done(null, stream));
        stream.once('error', done);
    }

    _needsDateRotate() {
        return this._options.dateRotate && Date.now() >= this._dateRotateEndTime;
    }

    _getLogfileDate() {
        let logfileDate;
        try {
            logfileDate = fs.statSync(this._filename).mtime;
            debug('Existing log file date', logfileDate);
        } catch (e) {
            debug('No existing log file');
        }
        return logfileDate;
    }

    _dateRotateUpdateDay(date) {
        const d = date || new Date();
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth();
        const day = d.getUTCDate();
        this._dateRotateStartTime = Date.UTC(year, month, day, 0, 0, 0, 0);
        this._dateRotateEndTime = Date.UTC(year, month, day + 1, 0, 0, 0, 0);
        debug('new end date', this._dateRotateEndTime);
    }

    _getArchiveLogName(time) {
        const d = new Date(time);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        const day = d.getUTCDate();

        const pad = s => {
            s = '' + s;
            return s.length < 2 ? '0' + s : s;
        };

        return path.join(this._dirname, this._basename + '-' + year + '-' + pad(month) + '-' + pad(day) + this._extname);
    }

    _dateRotateLog(callback) {
        this._close();

        // make archive name for current log file
        const archiveLogfile = this._getArchiveLogName(this._dateRotateStartTime);

        this._dateRotateUpdateDay();

        // move current log file to archive location
        debug('Rotating log from', this._filename, 'to', archiveLogfile);
        fs.access(archiveLogfile, (err) => {
            if (!err) {
                debug('Archive log file already exists', archiveLogfile);
                return callback();
            }
            fs.rename(this._filename, archiveLogfile, err => {
                /* istanbul ignore next */
                if (err) debug('Archive log rename error', err);
                callback();
            });
        });
    }

    _removeOldFiles() {
        const maxFiles = this._options.maxFiles;
        if (!maxFiles) return;

        const pattern = path.join(this._dirname, this._basename + '-*' + this._extname);

        debug('Finding old log files with pattern', pattern);
        this._dateRotateGlob(pattern, (err, files) => {
            if (err) return debug('Error removing old log files', err);
            if (!files || files.length <= maxFiles) return;

            const oldFiles = files.sort().reverse().slice(maxFiles);
            debug('Removing old log files', maxFiles, oldFiles);
            for (const file of oldFiles) fs.unlink(file, err => {
                /* istanbul ignore next */
                if (err) debug('Error removing old log file', err);
            });
        });
    }
}

module.exports = FileTransport;
