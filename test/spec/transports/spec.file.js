
const FileTransport = require('../../../lib/transports/file');
const StreamTransport = require('../../../lib/transports/stream');
const fs = require('fs');
const glob = require('glob');

const formatter = v => v;
const name = 'test';

describe('FileTransport Class', function () {
    describe('constructor', function () {
        let logfileDate;

        beforeEach(function () {
            logfileDate = new Date();
            sinon.stub(FileTransport.prototype, '_getLogfileDate').returns(logfileDate);
            sinon.stub(FileTransport.prototype, '_dateRotateUpdateDay');
        });

        afterEach(function () {
            FileTransport.prototype._getLogfileDate.restore();
            FileTransport.prototype._dateRotateUpdateDay.restore();
        });

        it('should extend StreamTransport', function () {
            const transport = new FileTransport({ name, formatter, filename: '/path/test.log' });
            transport.should.be.instanceof(StreamTransport);
        });

        it('should set up filename parts', function () {
            const transport = new FileTransport({ name, formatter, filename: '/path/test.log', dateRotate: true });
            transport._dirname.should.equal('/path');
            transport._basename.should.equal('test');
            transport._extname.should.equal('.log');
        });

        it('should call _getLogfileDate if dateRotate is set', function () {
            new FileTransport({ name, formatter, filename: '/path/test.log', dateRotate: true });
            FileTransport.prototype._getLogfileDate.should.have.been.calledOnce;
        });

        it('should call _dateRotateUpdateDay with the log file date', function () {
            new FileTransport({ name, formatter, filename: '/path/test.log', dateRotate: true });
            FileTransport.prototype._dateRotateUpdateDay.should.have.been.calledWithExactly(logfileDate);
        });

        it('should not call _getLogfileDate or _dateRotateUpdateDay if dateRotate is not set', function () {
            new FileTransport({ name, formatter, filename: '/path/test.log' });
            FileTransport.prototype._getLogfileDate.should.not.have.been.called;
            FileTransport.prototype._dateRotateUpdateDay.should.not.have.been.called;
        });

    });

    describe('_getLogfileDate', function () {
        let logfileDate;

        beforeEach(function () {
            logfileDate = new Date();
            sinon.stub(fs, 'statSync').returns({ mtime: logfileDate });
        });

        afterEach(function () {
            fs.statSync.restore();
        });

        it('should return the last-modified-time of the current log file', function () {
            let transport = new FileTransport({ name, formatter, filename: '/path/test.log' });
            let result = transport._getLogfileDate();
            fs.statSync.should.have.been.calledWithExactly('/path/test.log');
            result.should.equal(logfileDate);
        });

        it('should return undefined if the stat throws an error', function () {
            let transport = new FileTransport({ name, formatter, filename: '/path/test.log' });
            fs.statSync.throws(new Error);
            let result = transport._getLogfileDate();
            expect(result).to.equal(undefined);
        });
    });

    describe('_dateRotateUpdateDay', function () {
        let clock;

        beforeEach(function () {
            clock = sinon.useFakeTimers(Date.parse(new Date(2016, 10, 25, 12, 11, 10)));
        });

        afterEach(function () {
            clock.restore();
        });

        it('should set the time bounds of the current log file to the start and end of the current day', function () {
            let transport = new FileTransport({ name, formatter, filename: 'test' });
            transport._dateRotateUpdateDay();
            new Date(transport._dateRotateStartTime).toISOString()
                .should.equal('2016-11-25T00:00:00.000Z');
            new Date(transport._dateRotateEndTime).toISOString()
                .should.equal('2016-11-26T00:00:00.000Z');
        });

        it('should set the time bounds of the current log file to the start and end of the date given', function () {
            let transport = new FileTransport({ name, formatter, filename: 'test' });
            let logfileDate = new Date(2015, 9, 10, 12, 11, 10);
            transport._dateRotateUpdateDay(logfileDate);
            new Date(transport._dateRotateStartTime).toISOString()
                .should.equal('2015-10-10T00:00:00.000Z');
            new Date(transport._dateRotateEndTime).toISOString()
                .should.equal('2015-10-11T00:00:00.000Z');
        });

    });

    describe('_log and needsDateRotate', function () {
        let clock, transport;

        beforeEach(function () {
            clock = sinon.useFakeTimers(Date.parse(new Date(2016, 10, 25, 12, 11, 10)));
            sinon.stub(StreamTransport.prototype, '_close');
            sinon.stub(StreamTransport.prototype, '_log');
            transport = new FileTransport({ name, formatter, filename: 'test', dateRotate: true });
            transport._dateRotateEndTime = Date.now() + 1000;
        });

        afterEach(function () {
            clock.restore();
            StreamTransport.prototype._close.restore();
            StreamTransport.prototype._log.restore();
        });

        it('should close the current stream if the log needs to be rotated', function () {
            transport._stream = {};
            transport._log('args');
            StreamTransport.prototype._close.should.not.have.been.called;
            StreamTransport.prototype._log.should.have.been.calledWithExactly('args');

            StreamTransport.prototype._log.reset();
            clock.tick(24 * 60 * 60 * 1000);

            transport._log('args');
            StreamTransport.prototype._close.should.have.been.called;
            StreamTransport.prototype._log.should.have.been.calledWithExactly('args');
        });

    });

    describe('open', function () {
        let clock, transport, cb;

        beforeEach(function () {
            clock = sinon.useFakeTimers(Date.parse(new Date(2016, 10, 25, 12, 11, 10)));
            sinon.stub(FileTransport.prototype, '_needsDateRotate');
            sinon.stub(FileTransport.prototype, '_dateRotateLog').yields();
            sinon.stub(FileTransport.prototype, '_removeOldFiles');
            sinon.stub(FileTransport.prototype, '_createStream');
            cb = sinon.stub();
            transport = new FileTransport({ name, formatter, filename: '/path/test.log', dateRotate: true });
        });

        afterEach(function () {
            clock.restore();
            FileTransport.prototype._needsDateRotate.restore();
            FileTransport.prototype._dateRotateLog.restore();
            FileTransport.prototype._removeOldFiles.restore();
            FileTransport.prototype._createStream.restore();
        });

        it('should roatate logs before opening a new stream if required', function () {
            FileTransport.prototype._needsDateRotate.returns(true);
            transport.open(cb);
            FileTransport.prototype._dateRotateLog.should.have.been.called;
            FileTransport.prototype._removeOldFiles.should.have.been.called;
            FileTransport.prototype._createStream.should.have.been.calledWithExactly(cb);

            FileTransport.prototype._createStream.should.have.been.calledAfter(FileTransport.prototype._dateRotateLog);
        });

        it('should not roatate logs before opening a new stream if not required', function () {
            FileTransport.prototype._needsDateRotate.returns(false);
            transport.open(cb);
            FileTransport.prototype._dateRotateLog.should.not.have.been.called;
            FileTransport.prototype._removeOldFiles.should.not.have.been.called;
            FileTransport.prototype._createStream.should.have.been.calledWithExactly(cb);
        });
    });

    describe('_ctreateStream', function () {
        let transport, cb, stream;

        beforeEach(function () {
            stream = {
                once: sinon.stub()
            };
            sinon.stub(fs, 'createWriteStream').returns(stream);
            cb = sinon.stub();
            transport = new FileTransport({ name, formatter, filename: '/path/test.log' });
        });

        afterEach(function () {
            fs.createWriteStream.restore();
        });

        it('should create a write stream and call the callback when it is open', function () {
            transport._options.fileMode = 0o666;
            stream.once.withArgs('open').yields();
            transport._createStream(cb);
            fs.createWriteStream.should.have.been.calledWithExactly('/path/test.log', { flags: 'a', mode: 0o666 });
            cb.should.have.been.calledWithExactly(null, stream);
        });

        it('should callback with an error on stream creation error', function () {
            const err = new Error();
            stream.once.withArgs('error').yields(err);
            transport._createStream(cb);
            cb.should.have.been.calledWithExactly(err);
        });

        it('should not callback with an error after it is opened', function () {
            const err = new Error();
            stream.once.withArgs('open').yields();
            stream.once.withArgs('error').yields(err);
            transport._createStream(cb);
            cb.should.have.been.calledWithExactly(null, stream);
            cb.should.have.been.calledOnce;
        });
    });

    describe('_getArchiveLogName', function () {
        let transport;

        beforeEach(function () {
            transport = new FileTransport({ name, formatter, filename: '/path/test.log', dateRotate: true });
        });

        it('returns a log file based on the given datetime', function () {
            let time = Date.parse(new Date(2015, 6, 13, 12, 11, 10));
            let filename = transport._getArchiveLogName(time);
            filename.should.equal('/path/test-2015-07-13.log');
        });
    });

    describe('_dateRotateLog', function () {
        let transport, clock, cb;

        beforeEach(function () {
            clock = sinon.useFakeTimers(Date.parse(new Date(2016, 10, 25, 12, 11, 10)));
            transport = new FileTransport({ name, formatter, filename: '/path/test.log', dateRotate: true });
            sinon.stub(fs, 'access').yields({ message: 'file not found' });
            sinon.stub(fs, 'rename').yields();
            sinon.stub(FileTransport.prototype, '_dateRotateUpdateDay');
            cb = sinon.stub();
        });

        afterEach(function () {
            clock.restore();
            fs.access.restore();
            fs.rename.restore();
            FileTransport.prototype._dateRotateUpdateDay.restore();
        });

        it('calls _dateRotateUpdateDay', function () {
            transport._dateRotateLog(cb);
            FileTransport.prototype._dateRotateUpdateDay.should.have.been.calledOnce;
        });

        it('calls access to check if the archive log already exists', function () {
            transport._dateRotateLog(cb);
            fs.access.should.have.been.calledWithExactly('/path/test-2016-11-25.log', sinon.match.func);
        });

        it('calls callback if log file already exists', function () {
            fs.access.yields();
            transport._dateRotateLog(cb);
            fs.rename.should.not.have.been.called;
            cb.should.have.been.calledWithExactly();
        });

        it('renames the log file to an archive name', function () {
            transport._dateRotateLog(cb);
            fs.rename.should.have.been.calledWithExactly('/path/test.log', '/path/test-2016-11-25.log', sinon.match.func);
        });

        it('calls the callback after call to rename', function () {
            fs.rename.yields();
            transport._dateRotateLog(cb);
            cb.should.have.been.calledWithExactly();
        });
    });

    describe('_dateRotateGlob', function () {
        it('should be the glob module', function () {
            const transport = new FileTransport({ name, formatter, filename: '/path/test.log', dateRotate: true });
            transport._dateRotateGlob.should.equal(glob);
        });
    });

    describe('_removeOldFiles', function () {
        let transport, cb;

        beforeEach(function () {
            transport = new FileTransport({ name, formatter, filename: '/path/test.log', dateRotate: true, maxFiles: 3 });
            sinon.stub(fs, 'unlink').yields();
            transport._dateRotateGlob = sinon.stub();
        });

        afterEach(function () {
            fs.unlink.restore();
        });

        it('does not remove files if maxFiles is zero', function () {
            transport._options.maxFiles = 0;
            transport._removeOldFiles();
            transport._dateRotateGlob.should.not.have.been.called;
            fs.unlink.should.not.have.been.called;
        });

        it('calls glob with a pattern based on the logname', function () {
            transport._removeOldFiles();
            transport._dateRotateGlob.should.have.been.calledWithExactly(
                '/path/test-*.log',
                sinon.match.func
            );
        });

        it('calls fs.unlink for each of the oldest files outside of maxFiles', function () {
            transport._dateRotateGlob.yields(null, [
                '/path/test-2016-11-15.log',
                '/path/test-2016-07-02.log',
                '/path/test-2016-12-13.log',
                '/path/test-2015-11-14.log',
                '/path/test-2016-04-30.log',
                '/path/test-2016-11-13.log'
            ]);
            transport._removeOldFiles();
            fs.unlink.should.have.been.calledWithExactly('/path/test-2016-07-02.log', sinon.match.func);
            fs.unlink.should.have.been.calledWithExactly('/path/test-2016-04-30.log', sinon.match.func);
            fs.unlink.should.have.been.calledWithExactly('/path/test-2015-11-14.log', sinon.match.func);
        });

        it('does not remove files if number of files is equal to maxFiles', function () {
            transport._dateRotateGlob.yields(null, [
                '/path/test-2015-11-14.log',
                '/path/test-2016-07-02.log',
                '/path/test-2016-04-30.log'
            ]);
            transport._removeOldFiles(cb);
            fs.unlink.should.not.have.been.called;
        });

        it('does not remove files if number of files is less than maxFiles', function () {
            transport._dateRotateGlob.yields(null, [
                '/path/test-2015-11-14.log',
                '/path/test-2016-04-30.log'
            ]);
            transport._removeOldFiles(cb);
            fs.unlink.should.not.have.been.called;
        });

        it('does not remove files if there is a glob error', function () {
            transport._dateRotateGlob.yields(null);
            transport._removeOldFiles();
            fs.unlink.should.not.have.been.called;

            transport._dateRotateGlob.yields({ message: 'Error' });
            transport._removeOldFiles();
            fs.unlink.should.not.have.been.called;
        });
    });

});
