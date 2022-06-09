
let Logger = require('../../lib/logger');
let Manager = require('../../lib/manager');
let IncomingMessage = require('http').IncomingMessage;


describe('Logger Class', function () {

    it('should be a function', function () {
        Logger.should.be.a('function');
    });

});

describe('logger instance', function () {

    it('should be an object', function () {
        let logger = new Logger('testname');
        logger.should.be.an('object');
        logger.should.be.instanceof(Logger);
        logger._name.should.equal('testname');
    });

    describe('_addMeta', function () {
        let logger = new Logger('testname');
        let sources = [
            {
                source: {
                    name: 'value'
                }
            },
            {
                source: {
                    name: 'notvalue'
                },
                source2: {
                    name: 'notvalue'
                }
            }
        ];


        it('should add first value found in sources', function () {
            let dest = {
                original: 'dest'
            };

            logger._addMetaData(dest, {
                destName: 'source.name'
            }, sources);

            dest.should.deep.equal({
                original: 'dest',
                destName: 'value'
            });
        });

        it('should ignore values not found in sources', function () {
            let dest = {
                original: 'dest'
            };

            logger._addMetaData(dest, {
                destName: 'source.name.not.present'
            }, sources);

            dest.should.deep.equal({
                original: 'dest'
            });
        });

        it('should handle plain text meta with the txt token function', function () {
            let dest = {};
            let sources = [
                Logger.tokens
            ];

            logger._addMetaData(dest, {
                keyName: 'txt.Plain text with chars. Symbols + / " -'
            }, sources);

            dest.should.deep.equal({
                keyName: 'Plain text with chars. Symbols + / " -'
            });
        });
    });

    describe('trimHtml', function () {
        let logger = new Logger();

        it('should filter an html body to raw text', function () {
            let body = '<html><head><title>a\n title</title></head><body>\r\n<b\n>this</b> is <i>the</i><br>body<script>\n\n//\n</script></body></html>';

            logger.trimHtml(body).should.equal('a title: this is the body');
        });

        it('should return anything that isn\'t a string', function () {
            logger.trimHtml(123).should.equal(123);
            let obj = {};
            logger.trimHtml(obj).should.equal(obj);
            let arr = [];
            logger.trimHtml(arr).should.equal(arr);
            expect(logger.trimHtml(undefined)).to.be.undefined;
        });

        it('should shorten a body to max length', function () {
            let body = Array(501).join('a');

            logger.trimHtml(body).should.have.length(400);
            logger.trimHtml(body, 200).should.have.length(200);
            logger.trimHtml(body, 600).should.have.length(500);
            logger.trimHtml('longbody', 7).should.equal('long...');
        });

    });


    describe('log', function () {
        let logger, manager, cb;

        beforeEach(function () {
            manager = new Manager();
            sinon.stub(manager, '_logToTransports');
            delete global.GlobalHmpoLogger;
            manager.config();
            logger = new Logger('test', manager);
            cb = sinon.stub();
        });

        it('should default no metadata and unknown label if no args given to logger instance', function () {
            logger = new Logger(null, manager);
            logger.log('info', 'message', { foo: 'bar'}, cb);

            manager._logToTransports.should.have.been.calledWithExactly({
                '@timestamp': sinon.match.string,
                label: 'Unknown',
                '@level': 'info',
                level: 'INFO',
                foo: 'bar',
                host: sinon.match.string,
                message: 'message'
            }, cb);
        });

        it('should forward level methods to the log method', function () {
            logger = new Logger('test', manager);
            logger.info('message', { foo: 'bar'}, cb);

            manager._logToTransports.should.have.been.calledWithExactly({
                '@timestamp': sinon.match.string,
                label: 'test',
                '@level': 'info',
                level: 'INFO',
                foo: 'bar',
                host: sinon.match.string,
                message: 'message'
            }, cb);
        });

        it('should allow arg placeholders in the message', function () {
            logger = new Logger('test', manager);
            logger.log('info', 'message %s', 'arg', { foo: 'bar'}, cb);

            manager._logToTransports.should.have.been.calledWithExactly(sinon.match({
                level: 'INFO',
                foo: 'bar',
                message: 'message arg'
            }), cb);
        });

        it('should default to info and empty message if no args are given', function () {
            logger.log();

            manager._logToTransports.should.have.been.calledWithExactly({
                '@timestamp': sinon.match.string,
                label: 'test',
                '@level': 'debug',
                level: 'DEBUG',
                host: sinon.match.string,
                message: ''
            }, undefined);
        });

        it('should pick up error from metadata', function () {
            const err = new Error('an error message test');
            err.code = 'A_CODE';
            logger.log('info', 'message', err);

            manager._logToTransports.should.have.been.calledWithExactly({
                '@timestamp': sinon.match.string,
                label: 'test',
                '@level': 'info',
                level: 'INFO',
                stack: sinon.match.array,
                code: 'A_CODE',
                host: sinon.match.string,
                message: 'message'
            }, undefined);
        });

        it('should use the message and original object from the an error', function () {
            const err = new Error('an error message test');
            err.code = 'A_CODE';
            err.obj = { complex: 'object' };
            err.original = { foo: 'bar' };
            err.constructor = 'bad constructor injection'; // should be ignored
            logger.log('info', '', err);

            manager._logToTransports.should.have.been.calledWithExactly({
                '@timestamp': sinon.match.string,
                label: 'test',
                '@level': 'info',
                level: 'INFO',
                stack: sinon.match.array,
                code: 'A_CODE',
                original: {foo: 'bar'},
                host: sinon.match.string,
                message: 'an error message test'
            }, undefined);
        });

        it('should add meta placeholders to the message', function () {
            logger.log('info', 'message :test1 :test2 :json.deep[0] :notfound',
                {test1: 'metadata', json: { deep: [ 'object' ]}, test2: 4});

            manager._logToTransports.should.have.been.calledWithExactly(sinon.match({
                message: 'message metadata 4 object -'
            }), undefined);
        });

        it('should decoded a req object in meta', function () {
            let req = new IncomingMessage();
            req.method = 'GET';
            req.sessionID = 'abc123';
            req.originalUrl = '/abc/123';
            req.url = '/123';
            req.res = {
                statusCode: 200,
                responseTime: 5000
            };

            logger.log('request', 'message', {req});

            manager._logToTransports.should.have.been.calledWithExactly(sinon.match({
                message: 'message',
                label: 'test',
                host: sinon.match.string,
                sessionID: 'abc123',
                method: 'GET',
                request: '/abc/123',
                response: 200,
                responseTime: 5000
            }), undefined);
        });

        it('should deal with there being no meta config', function () {
            let req = new IncomingMessage();
            req.method = 'GET';
            req.sessionID = 'abc123';
            req.originalUrl = '/abc/123';
            req.url = '/123';
            req.res = {
                statusCode: 200,
                responseTime: 5000
            };

            manager._options = {};

            logger.log('request', 'message', {req});

            manager._logToTransports.should.have.been.calledWithExactly({
                '@timestamp': sinon.match.string,
                '@level': 'request',
                level: 'REQUEST',
                label: 'test',
                message: 'message'
            }, undefined);
        });

        it('should pull req out of res object in meta', function () {
            let res = {
                req: {
                    url: 'testurl'
                }
            };

            logger.log('info', 'message :request', {res});

            manager._logToTransports.should.have.been.calledWithExactly(sinon.match({ message: 'message testurl' }), undefined);
        });

        it('should decode an unpopulated req object in meta', function () {
            let req = new IncomingMessage();

            logger.log('info', 'message', {req});

            manager._logToTransports.should.have.been.calledWithExactly(sinon.match({ request: '' }), undefined);
        });

    });

    describe('tokens', function () {

        describe('request', function () {
            it('should return the full request URL', function () {
                let meta = {
                    req: {
                        originalUrl: '/test/path?query=string',
                        url: '/path'
                    }
                };
                Logger.tokens.request.fn.call(meta)
                    .should.equal('/test/path?query=string');
            });

            it('should return the url if originaUrl is not present', function () {
                let meta = {
                    req: {
                        url: '/path'
                    }
                };
                Logger.tokens.request.fn.call(meta)
                    .should.equal('/path');
            });
        });

        describe('strippedRequest', function () {
            it('should return originalUrl without the query string', function () {
                let meta = {
                    req: {
                        originalUrl: '/test/path?query=string',
                        url: '/path'
                    }
                };
                Logger.tokens.strippedRequest.fn.call(meta)
                    .should.equal('/test/path');
            });

            it('should return url without the query string if orginalUrl is not present', function () {
                let meta = {
                    req: {
                        url: '/test/path?query=string'
                    }
                };
                Logger.tokens.strippedRequest.fn.call(meta)
                    .should.equal('/test/path');
            });

            it('should return a url that has no query string', function () {
                let meta = {
                    req: {
                        originalUrl: '/test/path',
                        url: '/path'
                    }
                };
                Logger.tokens.strippedRequest.fn.call(meta)
                    .should.equal('/test/path');
            });

            it('should return the url if originaUrl is not present', function () {
                let meta = {
                    req: {
                        url: '/path'
                    }
                };
                Logger.tokens.strippedRequest.fn.call(meta)
                    .should.equal('/path');
            });

            it('should return undefined if neither is present', function () {
                let meta = {
                    req: {}
                };
                expect(Logger.tokens.strippedRequest.fn.call(meta)).to.be.undefined;
            });

            it('should return undefined if req is not present', function () {
                let meta = {};
                expect(Logger.tokens.strippedRequest.fn.call(meta)).to.be.undefined;
            });
        });

        describe('httpVersion', function () {
            it('should return formatted http version', function () {
                let meta = {
                    req: {
                        httpVersionMajor: 44,
                        httpVersionMinor: 55
                    }
                };
                Logger.tokens.httpVersion.fn.call(meta)
                    .should.equal('44.55');
            });

            it('should return undefined if no http version present', function () {
                expect(Logger.tokens.httpVersion.fn.call({ req: {} }))
                    .to.be.undefined;
            });
        });

        describe('env', function () {
            it('should return an environment variable', function () {
                Logger.tokens.env.fn.call(null, 'USER')
                    .should.equal(process.env.USER);
            });

            it('should return undefined for unlikely env variable', function () {
                delete process.env.NON_EXISTANT_ENV_VAR;
                expect(Logger.tokens.res.fn.call(null, 'NON_EXISTANT_ENV_VAR'))
                    .to.be.undefined;
            });
        });

        describe('txt', function () {
            it('should return the argument as the value', function () {
                Logger.tokens.txt.fn.call(null, 'value')
                    .should.equal('value');
            });

            it('should join all aruments together with dots', function () {
                Logger.tokens.txt.fn.call(null, 'value', ' value 2')
                    .should.equal('value. value 2');
            });
        });

        describe('res', function () {
            let getHeader = sinon.stub();
            getHeader.returns(undefined);
            getHeader.withArgs('test1').returns('value');
            getHeader.withArgs('test2').returns(['array1', 2]);
            let context = {
                res: {
                    getHeader: getHeader
                }
            };

            it('should return the correct response header', function () {
                Logger.tokens.res.fn.call(context, 'test1')
                    .should.equal('value');
                sinon.assert.calledWith(getHeader, 'test1');
            });

            it('should return the correct response array header', function () {
                Logger.tokens.res.fn.call(context, 'test2')
                    .should.equal('array1, 2');
                sinon.assert.calledWith(getHeader, 'test2');
            });

            it('should return undefined for an non-existant header', function () {
                expect(Logger.tokens.res.fn.call(context, 'test13'))
                    .to.be.undefined;
                sinon.assert.calledWith(getHeader, 'test2');
            });

            it('should return undefined for no getHeaders', function () {
                expect(Logger.tokens.res.fn.call({res: {}}, 'test'))
                    .to.be.undefined;
            });

            it('should return undefined for no req', function () {
                expect(Logger.tokens.res.fn.call({}, 'test'))
                    .to.be.undefined;
            });
        });

        describe('req', function () {
            let context = {
                req: {
                    headers: {
                        test: 'value',
                        wrong: 'wrong',
                        multi: ['value1', 'value2']
                    }
                }
            };

            it('should return the correct request header', function () {
                Logger.tokens.req.fn.call(context, 'test')
                    .should.equal('value');
            });

            it('should return the correct request header if multiple', function () {
                Logger.tokens.req.fn.call(context, 'multi')
                    .should.equal('value1, value2');
            });

            it('should return undefined for no headers', function () {
                expect(Logger.tokens.req.fn.call({res: {}}, 'test'))
                    .to.be.undefined;
            });

            it('should return undefined for no req', function () {
                expect(Logger.tokens.req.fn.call({}, 'test'))
                    .to.be.undefined;
            });
        });

        describe('clientip', function () {
            it('should return ip from remoteAddress', function () {
                let context = {
                    req: {
                        connection: {
                            remoteAddress: '1234'
                        }
                    }
                };

                Logger.tokens.clientip.fn.call(context)
                    .should.equal('1234');
            });

            it('should return ip from the processed request ip', function () {
                let context = {
                    req: {
                        ip: '5678',
                        connection: {
                            remoteAddress: '1234'
                        }
                    }
                };

                Logger.tokens.clientip.fn.call(context)
                    .should.equal('5678');
            });

            it('should return undefined for no req', function () {
                expect(Logger.tokens.clientip.fn.call({}))
                    .to.be.undefined;
            });
        });

    });

    describe('reToken', function () {
        it('should not match tokenless string', function () {
            let match = Logger.reToken().exec('part1.part2.part3');
            expect(match).to.not.be.ok;
        });
        it('should match a valid dot token', function () {
            let match = Logger.reToken().exec(':part1.part2.part3');
            expect(match).to.be.ok;
            match[2].should.equal('part1.part2.part3');
        });
        it('should match a valid dot and bracket token', function () {
            let match = Logger.reToken().exec(':part1.part2[part3]');
            expect(match).to.be.ok;
            match[2].should.equal('part1.part2');
            match[4].should.equal('part3');
        });

        it('should match a percentage placeholder', function () {
            let match = Logger.reToken().exec('blah %s blah');
            expect(match).to.be.ok;
            match[1].should.equal('%');
        });
    });

});
