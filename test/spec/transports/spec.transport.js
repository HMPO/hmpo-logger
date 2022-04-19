
const { expect } = require('chai');
const Transport = require('../../../lib/transports/transport');

describe('Transport Class', function () {
    describe('constructor', function () {
        it('should throw an error if a formatter is not specified', () => {
            expect(() => new Transport()).to.throw('Invalid formatter');
        });
        it('should work out the numeric level of the transport level', () => {
            const transport = new Transport({ formatter: v => v, level: 'info' });
            transport._level.should.equal(5);
        });
    });

    describe('_log', function () {
        let transport, cb, formatter;

        beforeEach(function () {
            formatter = sinon.stub().returns('formatted');
            transport = new Transport({ formatter, level: 'info' });
            sinon.spy(transport, 'log');
            cb = sinon.stub();
        });

        it('should check if the log item should be logged based on level', function () {
            transport._log({'@level': 'debug'}, cb);
            transport.log.should.not.have.been.called;

            transport._log({'@level': 'fatal'}, cb);
            transport.log.should.have.been.called;
        });

        it('should format the metadata', function () {
            const meta = {'@level': 'fatal'};
            transport._log(meta, cb);
            formatter.should.have.been.calledWithExactly(meta);
            transport.log.should.have.been.calledWithExactly('formatted', meta, cb);
            cb.should.have.been.calledWithExactly();
        });

        it('should allow not specifying a cb', function () {
            const meta = {'@level': 'fatal'};
            expect(() => transport._log(meta)).not.to.throw();
            formatter.should.have.been.calledWithExactly(meta);
            transport.log.should.have.been.calledWithExactly('formatted', meta, undefined);
        });

    });
});
