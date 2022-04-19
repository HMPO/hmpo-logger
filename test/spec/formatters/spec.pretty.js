
let pretty = require('../../../lib/formatters/pretty');


describe('pretty formatter', function () {
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
        pretty.should.be.a('function');
        const formatter = pretty();
        formatter.should.be.a('function');
        formatter.name.should.equal('prettyFormatter');
        formatter.should.have.length(1);
    });

    it('should serialise metadata into pretty text format', function () {
        const formatter = pretty();
        const output = formatter(meta);

        output.should.equal(
            '1970-01-01T00:00:00.000Z INFO: test message\n' +
            '  array: [ 1, 2, 3 ],\n' +
            '  float: 1.23456,\n' +
            '  func: [Function: func],\n' +
            '  number: 12345,\n' +
            '  object: { foo: \'bar\' },\n' +
            '  string: \'string\''
        );
    });

    it('should serialise with colors', function () {
        const formatter = pretty({ colors: true });
        const output = formatter(meta);

        output.should.equal(
            '1970-01-01T00:00:00.000Z \u001b[32mINFO\u001b[39m: test message\n' +
            '  array: [ \u001b[33m1\u001b[39m, \u001b[33m2\u001b[39m, \u001b[33m3\u001b[39m ],\n' +
            '  float: \u001b[33m1.23456\u001b[39m,\n' +
            '  func: \u001b[36m[Function: func]\u001b[39m,\n' +
            '  number: \u001b[33m12345\u001b[39m,\n' +
            '  object: { foo: \u001b[32m\'bar\'\u001b[39m },\n' +
            '  string: \u001b[32m\'string\'\u001b[39m'
        );
    });

    it('should serialise with no extra metadata', function () {
        meta = {
            level: 'INFO',
            '@level': 'info',
            '@timestamp': '1970-01-01T00:00:00.000Z',
            message: 'test message'
        };

        const formatter = pretty();
        const output = formatter(meta);

        output.should.equal('1970-01-01T00:00:00.000Z INFO: test message');
    });

    it('should handle colors with an unknown level', function () {
        meta = {
            level: 'BLAH',
            '@level': 'blah',
            '@timestamp': '1970-01-01T00:00:00.000Z',
            message: 'test message'
        };

        const formatter = pretty({ colors: true });
        const output = formatter(meta);

        output.should.equal('1970-01-01T00:00:00.000Z BLAH: test message');
    });

});

