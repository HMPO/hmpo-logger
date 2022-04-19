
let logstash = require('../../../lib/formatters/logstash');


describe('logstash formatter', function () {
    let meta;

    beforeEach(function () {
        meta = {
            level: 'INFO',
            string: 'string',
            number: 12345,
            float: 1.23456,
            object: { foo: 'bar' },
            array: [ 1, 2, 3 ],
            func: function () {},
            '@level': 'info',
            '@timestamp': '1970-01-01T00:00:00.000Z',
            message: 'test message',
            circular: {}
        };
        meta.circular.content = meta.circular;
    });

    it('should create a formatter function', function () {
        logstash.should.be.a('function');
        const formatter = logstash();
        formatter.should.be.a('function');
        formatter.name.should.equal('logstashFormatter');
        formatter.should.have.length(1);
    });

    it('should serialise metadata into logstash format', function () {
        const formatter = logstash();
        const output = formatter(meta);

        output.should.equal(
            '{' +
            '"@timestamp":"1970-01-01T00:00:00.000Z",' +
            '"level":"INFO",' +
            '"message":"test message",' +
            '"array":[1,2,3],' +
            '"circular":{"content":"[circular]"},' +
            '"float":1.23456,' +
            '"number":12345,' +
            '"object":{"foo":"bar"},' +
            '"string":"string"' +
            '}'
        );
    });

    it('should allow specifying options', function () {
        meta.string = new Array(200).join('A');
        const formatter = logstash({ maxLength: 30, indent: 2 });
        const output = formatter(meta);

        output.should.equal(
            '{\n' +
            '  "@timestamp": "1970-01-01T00:00:00.000Z",\n' +
            '  "level": "INFO",\n' +
            '  "message": "test message",\n' +
            '  "array": [\n' +
            '    1,\n' +
            '    2,\n' +
            '    3\n' +
            '  ],\n' +
            '  "circular": {\n' +
            '    "content": "[circular]"\n' +
            '  },\n' +
            '  "float": 1.23456,\n' +
            '  "number": 12345,\n' +
            '  "object": {\n' +
            '    "foo": "bar"\n' +
            '  },\n' +
            '  "string": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..."\n' +
            '}'
        );
    });

});

