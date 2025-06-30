
const Manager = require('../../lib/manager');
const Logger = require('../../lib/logger');
const transports = require('../../lib/transports');
const { expect } = require('chai');

describe('Manager Class', function () {

    it('should be a function', function () {
        Manager.should.be.a('function');
    });

});

describe('instance', function () {
    let manager = new Manager();

    it('should be an object', function () {
        manager.should.be.an('object');
        manager.should.be.instanceof(Manager);
    });

    describe('getGlobal', function () {

        it('should return the value of global.GlobalHmpoLogger', function () {
            global.GlobalHmpoLogger = 'testglobal';
            manager.getGlobal().should.equal('testglobal');
        });

        it('should return the current manager if no global has been set my config()', function () {
            global.GlobalHmpoLogger = null;
            manager.getGlobal().should.equal(manager);
        });
    });

    describe('config', function () {
        beforeEach(function () {
            delete global.GlobalHmpoLogger;
        });

        it('should set this logger as global.GlobalHmpoLogger', function () {
            manager.config();

            global.GlobalHmpoLogger.should.equal(manager);
        });

        it('should warn to console if config is used twice', sinon.test(function () {
            this.stub(global.console, 'warn');
            manager.config();
            global.console.warn.should.not.have.been.called;
            manager.config();
            global.console.warn.should.have.been.calledOnce;
        }));

        it('should set up default logging transport', function () {
            manager.config();

            let t = [...manager._transports];
            t.length.should.equal(1);

            t[0].type.should.equal('ConsoleTransport');
            t[0].name.should.equal('console');
            t[0]._options.level.should.equal('debug');
        });

        it('should set up specified logging transport', function () {
            manager.config({
                consoleLevel: 'testconsolelevel',
                app: './testapp.log',
                appLevel: 'testapplevel',
                error: './testerror.log',
                errorLevel: 'testerrorlevel'
            });

            let t = [...manager._transports];
            t.length.should.equal(3);

            t[0].type.should.equal('ConsoleTransport');
            t[0].name.should.equal('console');
            t[0]._options.level.should.equal('testconsolelevel');

            t[1].type.should.equal('FileTransport');
            t[1].name.should.equal('app');
            t[1]._options.level.should.equal('testapplevel');
            t[1]._options.filename.should.equal('./testapp.log');

            t[2].type.should.equal('FileTransport');
            t[2].name.should.equal('error');
            t[2]._options.level.should.equal('testerrorlevel');
            t[2]._options.filename.should.equal('./testerror.log');
        });

        it('should only set up error transport if app and error filenames are the same', function () {
            manager.config({
                consoleLevel: 'testconsolelevel',
                app: './testapp.log',
                appLevel: 'info',
                error: './testapp.log',
                errorLevel: 'error',
                errorJSON: false
            });

            let t = [...manager._transports];
            t.length.should.equal(2);

            t[0].type.should.equal('ConsoleTransport');
            t[0].name.should.equal('console');
            t[0]._options.level.should.equal('testconsolelevel');

            t[1].type.should.equal('FileTransport');
            t[1].name.should.equal('error');
            t[1]._options.level.should.equal('info');
            t[1]._options.filename.should.equal('./testapp.log');
            t[1]._options.formatter.name.should.equal('logstashFormatter');
        });

        it('should merge settings from error and app configs', function () {
            manager.config({
                consoleLevel: 'testconsolelevel',
                app: './testapp.log',
                appLevel: 'info',
                error: './testapp.log',
                errorJSON: true,
                errorLevel: 'error'
            });

            let t = [...manager._transports];
            t.length.should.equal(2);

            t[0].type.should.equal('ConsoleTransport');
            t[0].name.should.equal('console');
            t[0]._options.level.should.equal('testconsolelevel');
            t[0]._options.formatter.name.should.equal('prettyFormatter');

            t[1].type.should.equal('FileTransport');
            t[1].name.should.equal('error');
            t[1]._options.level.should.equal('info');
            t[1]._options.formatter.name.should.equal('logstashFormatter');
            t[1]._options.filename.should.equal('./testapp.log');
        });

        it('should use higher known level if error level is not known', function () {
            manager.config({
                app: './testapp.log',
                appLevel: 'info',
                error: './testapp.log',
                errorLevel: 'unknownlevel'
            });

            let t = [...manager._transports];
            t.length.should.equal(2);

            t[1].name.should.equal('error');
            t[1]._options.level.should.equal('info');
        });

        it('should use higher known level if app level is not known', function () {
            manager.config({
                app: './testapp.log',
                appLevel: 'unknownlevel',
                error: './testapp.log',
                errorLevel: 'info'
            });

            let t = [...manager._transports];
            t.length.should.equal(2);

            t[1].name.should.equal('error');
            t[1]._options.level.should.equal('info');
        });

        it('should use pretty console logging and text file logging if JSON is false', function () {
            manager.config({
                app: 'file1.log',
                error: 'file2.log',
                consoleJSON: false,
                appJSON: false,
                errorJSON: false
            });

            let t = [...manager._transports];
            t.length.should.equal(3);

            t[0]._options.formatter.name.should.equal('prettyFormatter');
            t[1]._options.formatter.name.should.equal('textFormatter');
            t[2]._options.formatter.name.should.equal('textFormatter');
        });

        it('should use logstash logging if JSON is true', function () {
            manager.config({
                app: 'file1.log',
                error: 'file2.log',
                consoleJSON: true,
                appJSON: true,
                errorJSON: true
            });

            let t = [...manager._transports];
            t.length.should.equal(3);

            t[0]._options.formatter.name.should.equal('logstashFormatter');
            t[1]._options.formatter.name.should.equal('logstashFormatter');
            t[2]._options.formatter.name.should.equal('logstashFormatter');
        });

        it('should disable transports that are specified as falsey', function () {
            manager.config({
                console: false,
                app: false,
                error: false
            });

            let t = [...manager._transports];
            t.length.should.equal(0);
        });

        it('should augment instead of overwriting configured meta data', function () {
            manager.config({
                meta: {
                    host: undefined,
                    request: null,
                    extra: 'extravalue',
                    method: false
                },
                requestMeta: {
                    method: null,
                    bytes: false,
                    clientip: undefined,
                    hostname: 0,
                    foo: 'bar'
                }
            });

            manager._options.meta.should.deep.equal({
                pm: 'env.pm_id',
                sessionID: 'sessionID',
                extra: 'extravalue'
            });

            manager._options.requestMeta.should.deep.equal({
                foo: 'bar',
                httpversion: 'version',
                port: 'port',
                realClientIp: 'realClientIp',
                forwardedFor: 'forwardedFor',
                remoteAddress: 'connection.remoteAddress',
                response: 'statusCode',
                responseTime: 'responseTime',
                uniqueID: 'req.x-uniq-id'
            });
        });

        it('should create loggers using the correct transports', function () {
            manager.config({
                app: 'file1.log',
                error: 'file2.log'
            });

            let t = [...manager._transports];
            t.length.should.equal(3);
            t[0].should.be.an.instanceOf(transports.ConsoleTransport);
            t[1].should.be.an.instanceOf(transports.FileTransport);
            t[2].should.be.an.instanceOf(transports.FileTransport);
        });

        it('should set maxFiles value on transport if rotation is specified in options', function () {
            manager.config({
                dateRotate: true,
                app: 'file1.log',
                error: 'file2.log',
                maxFiles: 10
            });

            let t = [...manager._transports];
            t.length.should.equal(3);
            t[1]._options.maxFiles.should.equal(10);
            t[2]._options.maxFiles.should.equal(10);
        });

        it('should create default regex for public', function () {
            manager.config();
            manager.rePublicRequests.should.be.instanceOf(RegExp);
            manager.rePublicRequests.toString().should.equal('/\\/public\\//');
        });

        it('should create default regex for healthcheck', function () {
            manager.config();
            manager.reHealthcheckRequests.should.be.instanceOf(RegExp);
            manager.reHealthcheckRequests.toString().should.equal('/^\\/healthcheck(\\/|$)/');
        });

        it('should create regex for public based on config', function () {
            manager.config({ publicPattern: '123' });
            manager.rePublicRequests.should.be.instanceOf(RegExp);
            manager.rePublicRequests.toString().should.equal('/123/');
        });

        it('should create regex for healthcheck based on config', function () {
            manager.config({ healthcheckPattern: '456' });
            manager.reHealthcheckRequests.should.be.instanceOf(RegExp);
            manager.reHealthcheckRequests.toString().should.equal('/456/');
        });

        it('should build transports from full config inclusing custom transport', function () {
            class MyTransport extends manager.transportClasses.FileTransport { }
            manager.addTransportClass(MyTransport);

            manager.config({
                console: false,
                transports: [
                    { name: 'textfile', className: 'MyTransport', filename: 'test.log' },
                    { name: 'console', formatter: 'pretty' }
                ]
            });

            let t = [...manager._transports];
            t.length.should.equal(2);

            t[0].name.should.equal('textfile');
            t[0].type.should.equal('MyTransport');
            t[0]._options.formatter.name.should.equal('textFormatter');
            t[1].name.should.equal('console');
            t[1].type.should.equal('ConsoleTransport');
            t[1]._options.formatter.name.should.equal('prettyFormatter');
        });

        it('should throw an error if a transport class isnt found', function () {
            expect(() => {
                manager.config({
                    console: false,
                    transports: [
                        { name: 'test', className: 'UnknownTransport' },
                    ]
                });
            }).to.throw('Invalid transport class');
        });

        it('should throw an error if a formatter isnt found', function () {
            expect(() => {
                manager.config({
                    console: false,
                    transports: [
                        { name: 'test', className: 'ConsoleTransport', formatter: 'unknown' },
                    ]
                });
            }).to.throw('Invalid formatter name');
        });

        it('should throw an error if a formatter isnt found', function () {
            manager.addFormatter(function testFormatter() { return 'string'; });
            expect(() => {
                manager.config({
                    console: false,
                    transports: [
                        { name: 'test', className: 'ConsoleTransport', formatter: 'testFormatter' },
                    ]
                });
            }).to.throw('Invalid formatter function');
        });
    });

    describe('middleware', function () {
        let logger;
        let req, res, cb;

        before(function () {
            delete global.GlobalHmpoLogger;
            logger = manager.config().get('testname');
        });

        beforeEach(function () {
            sinon.stub(manager, 'get').returns(logger);
            sinon.stub(logger, 'request');

            req = {};
            res = {
                writeHead: sinon.stub()
            };
            cb = sinon.stub();
        });

        afterEach(function () {
            manager.get.restore();
            logger.request.restore();
        });

        it('should return express middleware', function () {
            let middleware = manager.middleware();

            middleware.should.be.a('function');
            middleware.length.should.equal(3);
        });

        it('should log using label of :express', function () {
            manager.middleware();
            manager.get.should.have.been.calledWithExactly(':express');
        });

        it('should log using given logger name as label', function () {
            manager.middleware('customname');
            manager.get.should.have.been.calledWithExactly('customname');
        });

        it('should log details from a request', function (done) {
            let middleware = manager.middleware();

            middleware(req, res, cb);
            cb.should.have.been.calledOnce;

            res.writeHead();

            setTimeout(function () {
                res.responseTime.should.be.a('number');
                logger.request.should.have.been.calledOnce;
                logger.request.should.have.been.calledWithExactly(
                    manager._options.format,
                    { req: req, res: res }
                );
                done();
            }, 50);
        });

        it('should not log public static requests', function (done) {
            let middleware = manager.middleware();

            req.url = 'blah/public/blah';

            middleware(req, res, cb);
            cb.should.have.been.calledOnce;

            res.writeHead();

            setTimeout(function () {
                logger.request.should.not.have.been.called;
                done();
            }, 50);
        });

        it('should not log healthcheck requests', function (done) {
            let middleware = manager.middleware();

            req.url = '/healthcheck';

            middleware(req, res, cb);
            cb.should.have.been.calledOnce;

            res.writeHead();

            setTimeout(function () {
                logger.request.should.not.have.been.called;
                done();
            }, 50);
        });

    });

    describe('get', function () {
        beforeEach(function () {
            delete global.GlobalHmpoLogger;
            manager.config();
            sinon.stub(console, 'warn');
        });

        afterEach((function () {
            console.warn.restore();
        }));

        it('should log a warning if no global logger is set', function () {
            delete global.GlobalHmpoLogger;
            manager.get('testname1');
            console.warn.should.have.been.called;
        });

        it('should call the global logger get if this isnt it', function () {
            const globalGet = sinon.stub().returns('globallogger');
            global.GlobalHmpoLogger = {
                get: globalGet
            };
            const logger = manager.get('testname1');
            logger.should.equal('globallogger');
        });

        it('should return a logger with a specified name', function () {
            let logger = manager.get('testname1');

            logger.should.be.instanceof(Logger);
            logger._name.should.equal('testname1');

            let logger2 = manager.get('testname1');
            logger2.should.equal(logger);
        });

        it('should return a logger with a guessed name', function () {
            let logger = manager.get();

            logger.should.be.instanceof(Logger);
            logger._name.should.equal('hmpo-logger');
        });

        it('should return a logger with a joined name', function () {
            let logger = manager.get(':testname');

            logger.should.be.instanceof(Logger);
            logger._name.should.equal('hmpo-logger:testname');
        });
    });

    describe('_handleExceptions', function () {
        beforeEach(function () {
            delete global.GlobalHmpoLogger;
            manager.config();
            sinon.stub(Logger.prototype, 'log');
            sinon.stub(process, 'exit');
            sinon.stub(console, 'error');
        });
        afterEach(() => {
            Logger.prototype.log.restore();
            process.exit.restore();
            console.error.restore();
        });

        it('logs the exception error', () => {
            const e = new Error('error message');
            Manager._handleExceptions(e);
            Logger.prototype.log.should.have.been.calledOnceWithExactly('fatal', 'Unhandled Exception: :err.message', e, sinon.match.func);
        });

        it('exits after the logging is complete', () => {
            const e = new Error('error message');
            Logger.prototype.log.yields();
            Manager._handleExceptions(e);
            process.exit.should.have.been.calledWithExactly(1);
        });

        it('logs error to console if logging fails', () => {
            const e = new Error('error message');
            const logError = new Error('log error');
            Logger.prototype.log.yields(logError);
            Manager._handleExceptions(e);
            console.error.should.have.been.calledWithExactly('Error logging unhandled exception:', logError);
            console.error.should.have.been.calledWithExactly('Unhandled exception:', e);
            process.exit.should.have.been.calledWithExactly(1);
        });
    });

    describe('_logToTransports', function () {
        let stubs;
        beforeEach(function () {
            stubs = {
                transport1Log: sinon.stub(),
                transport2Log: sinon.stub()
            };
            delete global.GlobalHmpoLogger;
            manager.config();
            manager._transports.clear();
            manager._transports.add({
                _log: stubs.transport1Log
            });
            manager._transports.add({
                _log: stubs.transport2Log
            });

        });

        it('sends the meta to all transports and gets a callback when they are all done', () => {
            const meta = { foo: 'bar' };
            const cb = sinon.stub();
            stubs.transport1Log.yields();
            stubs.transport2Log.yields();

            manager._logToTransports(meta, cb);

            stubs.transport1Log.should.have.been.calledOnceWithExactly(meta, sinon.match.func);
            stubs.transport2Log.should.have.been.calledOnceWithExactly(meta, sinon.match.func);
            cb.should.have.been.calledWithExactly(undefined);
        });

        it('sends the meta to all transports and gets a callback with an error if one failed', () => {
            const meta = { foo: 'bar' };
            const cb = sinon.stub();
            const e = new Error();
            stubs.transport1Log.yields(e);
            stubs.transport2Log.yields();

            manager._logToTransports(meta, cb);

            stubs.transport1Log.should.have.been.calledOnceWithExactly(meta, sinon.match.func);
            stubs.transport2Log.should.have.been.calledOnceWithExactly(meta, sinon.match.func);
            cb.should.have.been.calledWithExactly(e);
        });

        it('sends the meta to all transports with no callback', () => {
            const meta = { foo: 'bar' };
            manager._logToTransports(meta);

            stubs.transport1Log.should.have.been.calledOnceWithExactly(meta, undefined);
            stubs.transport2Log.should.have.been.calledOnceWithExactly(meta, undefined);
        });
    });

});
