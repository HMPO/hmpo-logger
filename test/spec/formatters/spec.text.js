
let logstash = require('../../../lib/formatters/text');


describe('text formatter', function () {
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
        formatter.name.should.equal('textFormatter');
        formatter.should.have.length(1);
    });

    it('should serialise metadata into simple text format', function () {
        const formatter = logstash();
        const output = formatter(meta);

        output.should.equal('1970-01-01T00:00:00.000Z INFO test message');
    });
});

