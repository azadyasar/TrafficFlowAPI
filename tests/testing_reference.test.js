
// Common Matchers 

test('two plus two is four', () => {
    expect(2 + 2).toBe(4);
});

const dataObj = { one: 1 };
const func = () => console.log('hey');
dataObj['function'] = func;

test('object assignment', () => {
    expect(dataObj).toEqual({ one: 1, function: func });
});

test('adding positive numbers is not zero', () => {
    for (let a = 1; a < 10; a++) {
        for (let b = 1; b < 10; b++) {
            expect(a + b).not.toBe(0);
        }
    }
});

describe('Truthiness', () => {
    test('null', () => {
        const n = null;
        expect(n).toBeNull();
        expect(n).toBeDefined();
        expect(n).not.toBeUndefined();
        expect(n).not.toBeTruthy();
        expect(n).toBeFalsy();
    });

    test('zero', () => {
        const z = 0;
        expect(z).not.toBeNull();
        expect(z).toBeDefined();
        expect(z).not.toBeUndefined();
        expect(z).not.toBeTruthy();
        expect(z).toBeFalsy();
    });
});


describe('Numbers', () => {
    test('two plus two', () => {
        const value = 2 + 2;
        expect(value).toBeGreaterThan(3);
        expect(value).toBeGreaterThanOrEqual(3.5);
        expect(value).toBeLessThan(5);
        expect(value).toBeLessThanOrEqual(4.5);
    })

    test('adding floating point numbers', () => {
        const value = 0.1 + 0.2;
        //expect(value).toBe(0.3);      This won't work because of rounding error
        expect(value).toBeCloseTo(0.3);
    });
});

describe('Strings', () => {
    test('there is no I in team', () => {
        expect('team').not.toMatch(/I/);
    });

    test('but there is a "stop" in Christoph', () => {
        expect('Christoph').toMatch(/stop/);
    });
});

describe('Arrays', () => {
    const shoppingList = [
        'diapers',
        'kleenex',
        'trash bags',
        'paper towels',
        'beer',
    ];
    test('the shopping list has beer on it', () => {
        expect(shoppingList).toContain('beer');
    })
});

function compileAndroidCode() {
    throw new Error('you are using the wrong JDK');
}

describe('Exceptions', () => {
    test('compiling android goes as expected', () => {
        expect(compileAndroidCode).toThrow();
        expect(compileAndroidCode).toThrow(Error);

        // You can also use the exact error message or a regexp
        expect(compileAndroidCode).toThrow('you are using the wrong JDK');
        expect(compileAndroidCode).toThrow(/JDK/);
    });
});

function getUser() {
    return new Promise( (resolve, reject) => {
        setTimeout( () => {
            console.log('Inside getUser/Promise');
            resolve({id: 1});
        }, 3000);
    });
}

async function fetchData(cb) {
    // Wait a little while
    const result = await getUser();
    cb('peanut');
}

async function fetchDataProm() {
    return new Promise( (resolve, reject) => {
        setTimeout( () => {
            resolve({id: 1});
        }, 2575);
    });
}

async function fetchDataError() {
    return new Promise( (resolve, reject) => {
        reject('error I reject ');
    });
}

describe('Testing Asynchronous Code', () => {
    describe('Callbacks', () => {
        // Don't do this.
        /*  test('the data is peanut butter - wrong style', () => {
            function callback(data) {
                expect(data).toBe('peanut254');
            }

            fetchData(callback);
        }); */

        // Instead:
        test('the data is peanut - correct style', (done) => {
            function cb(data) {
                expect(data).toBe('peanut');
                expect(data).not.toBe('peanutre');
                done();
            }

            fetchData(cb);
        });
    });

    describe('Promises', () => {
        // It is simpler with promises
        test('the data is id: 1', () => {
            return fetchDataProm().then(data => {
                expect(data).toEqual({id: 1});
            });
        });

        test('the fetch fails with an error', () => {
            return expect(fetchDataError()).rejects.toMatch(/rej/);
        });
    });

});