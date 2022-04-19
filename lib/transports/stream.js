const debug = require('debug')('hmpo:logger:transport:stream');
const Transport = require('./transport');

class StreamTransport extends Transport {
    constructor(...args) {
        super(...args);

        this._buffer = [];
        this._flushing = false;
        this._opening = false;
        this._stream = null;
    }

    log(text, meta, callback) {
        if (!this._stream) {
            this._addToBuffer(text, callback);
            return this._open();
        }
        if (this._flushing || this._buffer.length) {
            this._addToBuffer(text, callback);
            return this._sendBuffer();
        }
        this.send(text, callback);
    }

    _addToBuffer(text, callback) {
        this._buffer.push([text, callback]);
        debug('Buffering log', this.type, this.name, this._buffer.length);
    }

    _open() {
        if (this._opening) return;
        debug('Opening log stream', this.type, this.name);
        this._opening = true;
        this.open((err, stream) => {
            this._opening = false;
            if (err) return console.error('Error opening log stream', err);
            this._stream = stream;
            stream.once('close', () => {
                debug('Stream closed', this.type, this.name);
                this._stream = null;
            });
            this._flushing = false;
            this._sendBuffer();
        });
    }

    // override this method to provide a stream
    open(callback) {
        callback(null, this._options.stream);
    }

    _sendBuffer() {
        if (this._flushing) return;
        if (!this._buffer.length) return;
        debug('Sending buffered logs', this.type, this.name, this._buffer.length);
        this._flushing = true;
        this._sendLoop();
    }

    _sendLoop() {
        if (!this._stream) return this._flushing = false;
        const [data, cb] = this._buffer.shift();
        this.send(data, err => {
            if (cb) cb(err);
            if (this._buffer.length) return this._sendLoop();
            this._flushing = false;
        });
    }

    send(text, callback) {
        debug('Send data to stream', text.length);
        return this._stream.write(text + (this._options.eol || '\n'), callback);
    }

    _close() {
        if (this._stream) {
            debug('Close stream');
            this.close(this._stream);
        }
        this._stream = null;
    }

    // override this method to close the stream
    close(stream) {
        if (stream.end) stream.end();
        if (stream.destroy) stream.destroy();
    }
}

module.exports = StreamTransport;
