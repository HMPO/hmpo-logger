
const StreamTransport = require('../../../lib/transports/stream');
// const Transport = require('../../../lib/transports/transport');

const name = 'test';
const formatter = v => v;

describe('StreamTransport Class', function () {
    let transport;
    let stream;

    beforeEach(() => {
        stream = {
            write: sinon.stub().yields(),
            once: sinon.stub()
        };
        transport = new StreamTransport({ name, formatter, stream });
    });

    describe('log', function () {
        let cb;

        beforeEach(function () {
            cb = sinon.stub();
        });

        it('should open a new stream and log to it', function () {
            transport.log('text', {}, cb);
            stream.write.should.have.been.calledWithExactly('text\n', sinon.match.func);
            cb.should.have.been.called;
        });

        it('should write to the stream if it is already open', function () {
            transport._open();
            sinon.spy(transport, 'open');

            transport.log('text', {}, cb);

            stream.write.should.have.been.calledWithExactly('text\n', sinon.match.func);
            cb.should.have.been.called;
            transport.open.should.not.have.been.called;
        });

        it('should buffer log if the stream is currently opening', function () {
            transport._opening = true;
            transport.log('text', {}, cb);

            stream.write.should.not.have.been.called;
            cb.should.not.have.been.called;
            transport._buffer.should.eql([
                ['text', cb]
            ]);
            transport._opening = false;
            transport._open();

            stream.write.should.have.been.calledWithExactly('text\n', sinon.match.func);
            cb.should.have.been.calledWithExactly(undefined);
        });

        it('should buffer log if the buffer is currently being flushed', function () {
            transport._open();
            transport._flushing = true;
            transport.log('text', {}, cb);

            stream.write.should.not.have.been.called;
            cb.should.not.have.been.called;
            transport._buffer.should.eql([
                ['text', cb]
            ]);
            transport._flushing = false;
            transport.log('text2', {});

            stream.write.should.have.been.calledWithExactly('text\n', sinon.match.func);
            stream.write.should.have.been.calledWithExactly('text2\n', sinon.match.func);
            cb.should.have.been.calledWithExactly(undefined);
        });

        it('should stop the send loop if the stream disapears', function () {
            transport._open();
            transport._buffer = [
                ['text1', undefined],
                ['text2', undefined],
                ['text3', undefined],
            ];
            // simulate stream closing while sending:
            stream.write.withArgs('text2\n').callsFake((text, cb) => {
                transport._close();
                cb();
            });

            transport.log('text4', {});

            stream.write.should.have.been.calledWithExactly('text1\n', sinon.match.func);
            stream.write.should.have.been.calledWithExactly('text2\n', sinon.match.func);

            transport._buffer.should.eql([
                ['text3', undefined],
                ['text4', undefined]
            ]);

            // buffer gets send on next log
            transport.log('text5', {});

            stream.write.should.have.been.calledWithExactly('text3\n', sinon.match.func);
            stream.write.should.have.been.calledWithExactly('text4\n', sinon.match.func);
            stream.write.should.have.been.calledWithExactly('text5\n', sinon.match.func);

            // buffer ends up empty
            transport._buffer.should.eql([]);
        });

    });

    describe('close', () => {
        it('doesnt close if there is no stream', () => {
            transport._close();
            expect(transport._stream).to.be.null;
        });

        it('calls end stream methods if present', () => {
            stream.end = sinon.stub();
            stream.destroy = sinon.stub();
            transport._open();

            transport._close();

            stream.end.should.have.been.calledWithExactly();
            stream.destroy.should.have.been.calledWithExactly();
            expect(transport._stream).to.be.null;
        });

        it('handles stream close event', () => {
            stream.once.withArgs('close').yields();
            transport._open();
            expect(transport._stream).to.be.null;
        });

        it('handles stream open error', () => {
            transport.open = sinon.stub().yields('err');
            transport._open();
            expect(transport._stream).to.be.null;
        });
    });
});
