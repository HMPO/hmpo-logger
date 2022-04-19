
const ConsoleTransport = require('../../../lib/transports/console');
const Transport = require('../../../lib/transports/transport');

const name = 'test';
const formatter = v => v;

describe('ConsoleTransport Class', function () {
    describe('log', function () {
        let transport, cb;

        beforeEach(function () {
            transport = new ConsoleTransport({ name, formatter });
            sinon.stub(console, 'log');
            sinon.stub(console, 'warn');
            sinon.stub(console, 'error');
            sinon.spy(console._stdout, 'write');
            sinon.spy(console._stderr, 'write');
            cb = sinon.stub();
        });

        afterEach(function () {
            console.log.restore();
            console.warn.restore();
            console.error.restore();
            console._stdout.write.restore();
            console._stderr.write.restore();
        });

        it('should inherit the base Transport class', function () {
            transport.should.be.an.instanceOf(Transport);
        });

        it('should output the log text to console error stderr', function () {
            transport.log('text', {'@level': 'fatal'}, cb);
            console._stderr.write('text\n', cb);
        });

        it('should output the log text to console warn stderr', function () {
            transport.log('text', {'@level': 'warn'}, cb);
            console._stderr.write('text\n', cb);
        });

        it('should output the log text to console log stdout', function () {
            transport.log('text', {'@level': 'info'}, cb);
            console._stdout.write('text\n', cb);
        });

        it('should output the log text to console error', function () {
            transport._stdout = null;
            transport._stderr = null;
            transport.log('text', {'@level': 'fatal'}, cb);
            console.error.should.have.been.calledWithExactly('text');
            cb.should.have.been.called;
        });

        it('should output the log text to console warn', function () {
            transport._stdout = null;
            transport._stderr = null;
            transport.log('text', {'@level': 'warn'}, cb);
            console.warn.should.have.been.calledWithExactly('text');
            cb.should.have.been.called;
        });

        it('should output the log text to console log', function () {
            transport._stdout = null;
            transport.log('text', {'@level': 'info'}, cb);
            console.log.should.have.been.calledWithExactly('text');
            cb.should.have.been.called;
        });

        it('should ignore callback if not supplied', function () {
            transport._stdout = null;
            transport.log('text', {'@level': 'info'});
            console.log.should.have.been.calledWithExactly('text');
        });


    });
});
