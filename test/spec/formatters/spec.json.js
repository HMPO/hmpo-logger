
const { expect } = require('chai');
let json = require('../../../lib/formatters/json');


describe('json formatter', function () {
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
            message: 'test message'
        };
    });

    it('should create a formatter function', function () {
        json.should.be.a('function');
        const formatter = json();
        formatter.should.be.a('function');
        formatter.name.should.equal('JSONFormatter');
        formatter.should.have.length(1);
    });

    it('should serialise metadata into json format', function () {
        const formatter = json();
        const output = formatter(meta);

        output.should.equal(
            '{\n' +
            '  "level": "INFO",\n' +
            '  "string": "string",\n' +
            '  "number": 12345,\n' +
            '  "float": 1.23456,\n' +
            '  "object": {\n' +
            '    "foo": "bar"\n' +
            '  },\n' +
            '  "array": [\n' +
            '    1,\n' +
            '    2,\n' +
            '    3\n' +
            '  ],\n' +
            '  "@level": "info",\n' +
            '  "@timestamp": "1970-01-01T00:00:00.000Z",\n' +
            '  "message": "test message"\n' +
            '}'
        );
    });

    it('should return undefined if there is an error', function () {
        meta.circular = {};
        meta.circular.content = meta.circular;
        const formatter = json();
        const output = formatter(meta);
        expect(output).to.be.undefined;
    });

});

