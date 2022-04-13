
let interpolate = require('../../lib/interpolate');


describe('interpolate', function () {

    describe('cleanValue', function () {

        it('should let safe primatives through', function () {
            interpolate.cleanValue('s').should.equal('s');
            interpolate.cleanValue(1).should.equal(1);
            interpolate.cleanValue(true).should.equal(true);
            expect(interpolate.cleanValue(null)).to.equal(null);
            expect(interpolate.cleanValue(undefined)).to.equal(undefined);
        });

        it('should stringify dates', function () {
            let date = new Date();
            let iso = date.toISOString();
            interpolate.cleanValue(date).should.equal(iso);

            let dateNumber = date.getTime();
            interpolate.cleanValue(dateNumber).should.equal(iso);
        });

        it('should not stringify dates if isoDates is disabled', function () {
            let date = new Date();
            interpolate.cleanValue(date, { isoDates: false }).should.equal(date);

            let dateNumber = date.getTime();
            interpolate.cleanValue(dateNumber, { isoDates: false }).should.equal(dateNumber);
        });

        it('should truncate strings that are too long', function () {
            const longtext = new Array(20).join('A');
            const result = interpolate.cleanValue(longtext, { maxLength: 10 });
            result.should.equal('AAAAAAAAAA...');
        });

        it('should stringify objects and arrays', function () {
            let data = {
                number: 1,
                boolean: true,
                string: 's',
                function: function () {},
                array: [1, '2', {'3': '3'}, [4], true],
                object: {
                    string: 's',
                    number: 1
                },
                null: null,
                undefined: undefined
            };

            interpolate.cleanValue(data).should.equal(
                '{"number":1,"boolean":true,"string":"s","array":[1,"2",{"3":"3"},[4],true],"object":{"string":"s","number":1},"null":null}');
        });

    });

    describe('stringify', function () {
        it('should limit the number of objects that are stringified', function () {
            const result = interpolate.stringify({
                deep: { deep: { deep: { deep: { deep: { deep: { deep: { deep: { deep: { deep: {}}}}}}}}}}
            });

            result.should.equal('{"deep":{"deep":{"deep":{"deep":{"deep":{"deep":{"deep":{"deep":{"deep":{"deep":"[object Object]"}}}}}}}}}}');
        });

        it('should return undefined if an error is thrown', function () {
            const result = interpolate.stringify({ toJSON: () => { throw new Error(); }});
            expect(result).to.be.undefined;
        });
    });


    describe('getTokenValue', function () {
        let source = {
            value1: 1,
            value2: {
                subvalue2: '2'
            },
            value3: {
                subvalue3: {
                    subsubvalue3: 3
                }
            }
        };

        it('should return undefined if a falsey key is given', function () {
            expect(interpolate.getTokenValue(source)).to.be.undefined;
            expect(interpolate.getTokenValue(source, '')).to.be.undefined;
            expect(interpolate.getTokenValue(source, false)).to.be.undefined;
            expect(interpolate.getTokenValue(source, null)).to.be.undefined;
        });
        it('should return value specified by dotted path', function () {
            interpolate.getTokenValue(source, 'value1').should.equal(1);
            interpolate.getTokenValue(source, 'value2.subvalue2').should.equal('2');
            interpolate.getTokenValue(source, 'value3.subvalue3.subsubvalue3').should.equal(3);
        });
        it('should return value specified by array of paths', function () {
            interpolate.getTokenValue(source, ['value2', 'subvalue2']).should.equal('2');
            interpolate.getTokenValue(source, ['value3.subvalue3', 'subsubvalue3']).should.equal(3);
            interpolate.getTokenValue(source, ['value3.subvalue3', null, 'subsubvalue3']).should.equal(3);
        });
        it('should return undefined for a nonexistant primative path', function () {
            expect(interpolate.getTokenValue(source, 'value2.badvalue')).to.not.be.ok;
        });
    });

});
