# TrafficFlowAPI

Provides a traffic flow information for the routes.

## Dependencies
* **Babel:** To transpile our ES6 JS code into ES5
* **Express:** Create a REST API
* **Joi:** Validate incoming input
* **Axios:** Make HTTP/S requests
* **Winston:** Log relevant information
* **Config:** Configure application variables
* **Morgan:** Log HTTP calls


## Project Structure
* **bin** Application starting points. ***dev*** for development, ***production*** for production.
* **dist** Not tracked. Folder for **babel** to transpile our source code into
* **config** App configuration filesc
* **scripts** Standalone scripts for dev uses
* **src** Source Code
    - **api** Applciation Programming Interface
        - **controllers** Controllers for corresponding routes/endpoints
        - **middleware** Middleware functions for routes e.g., authorization, logging
        - **routes** Routes/endpoints. Routes will be matched with controllers
    - **core** Business logic implementation
    - **dao** Data Access Objects
    - **services** Util libs (formats, validation, etc.)
* **tests** Testing
* **.env** Environment variables e.g., secret keys, passwords, credentials
* **package.json**
* **README.md**





## Miscallenous 

### How to Run
Issue

```npm start```

for development stage.

Issue 

```npm test``` or ```npm test -t <specific-test>```

for test purposes.

Issue 

```npm run production```

for production environment.



### Git Related
To pull the latest repository from a branch, issue:

```git pull origin master```

Or you can set up it so that your local master branch tracks github master branch as an upstream:

```git branch --set-upstream-to=origin/master master```

Now you can easily pull the latest repository:

```git pull```

Use **dev** branch for development purposes

```git checkout dev```

It is wiser to merge two branches inside **dev** first to see if there are conflicts and avoid overriding 

***(on branch dev)***  ``` git merge master```

and if everything seems ok, continue with:
```bash
git checkout master
git merge dev
```

Issue the following set of commands to check if there are changes on the remote server (whether another contributor has pushed something):

```bash
git remote update
git status -uno
git show-branch *master
```

### How to Use Winston Logger
Winston logger is constructed inside ***utils/logger*** module. The logger prints log messages in the following format  ``` timestamp [label level] message ```.

**require** ***./utils/logger*** to have access to logging functions. Custom logger makes use of the following 4 logging levels (the most important to the least):
- error
- warn
- info
- debug

Logged messages will be saved into the ***logs*** folder. Name of the log files are self-explanatory. You should note that a log file will write the incoming log message if the incoming log message has level that is greater than or equal to the level of the log file. To log relevant information, use the following schema in your **js** file.

```javascript
const logger = require('./utils/logger');
// ...
logger.log({
    level: 'info',
    message: 'Log info'
});
logger.info('log info');
logger.debug('log debug');
logger.warn('log warn');
logger.error('log error');
```

### How to Use Config

It is more convenient to make use of **config** package for several application variable as they might change depending on the machine, requirements, etc. Use the following config files for related variables
- **default.json:** &nbsp; All default variables
- **development.json:** &nbsp; All ***development*** related variables
- **production.json:** &nbsp;  All ***production*** related variables
- **custom-environment-variables.json:** &nbsp; All ***environment*** variables. Credentials and other crucial variables should be defined here as environment variables.

Note that custom config files will override ***default.json*** if any variable is defined in both places.

### How to Use Jest

Create your tests under the ***tests*** folder. Name convention is ```<test-name>.test.js```. To run a specific test, issue the following command:
```bash 
npm test -t <test-name>
```  
Here are some common test helpers. For more examples and a hands-on usage set, check out ```tests/testing_reference.test.js```.

* **Using Matchers**

    Jest uses "matchers" to let you test values in different ways. This document will introduce some commonly used matchers.

    - **Common Matchers**
        ```javascript
        test('two plus two is four', () => {
            expect(2 + 2).toBe(4);
        });
        ```
        In this code, expect(2 + 2) returns an "expectation" object. You typically won't do much with these expectation objects except call matchers on them. In this code, .toBe(4) is the matcher. When Jest runs, it tracks all the failing matchers so that it can print out nice error messages for you.
        ```javascript
        test('object assignment', () => {
            const data = {one: 1};
            data['two'] = 2;
            expect(data).toEqual({one: 1, two: 2});
        });
        ```
    - **Truthiness**

        In tests you sometimes need to distinguish between undefined, null, and false, but you sometimes do not want to treat these differently. Jest contains helpers that let you be explicit about what you want.
        - ***toBeNull*** matches only null
        - ***toBeUndefined*** matches only undefined
        - ***toBeDefined*** is the opposite of toBeUndefined
        - ***toBeTruthy*** matches anything that an if statement treats as true
        - ***toBeFalsy*** matches anything that an if statement treats as false
        
        ```javascript
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
        ```
    - Numbers 
        ```javascript
            test('two plus two', () => {
                const value = 2 + 2;
                expect(value).toBeGreaterThan(3);
                expect(value).toBeGreaterThanOrEqual(3.5);
                expect(value).toBeLessThan(5);
                expect(value).toBeLessThanOrEqual(4.5);

                // toBe and toEqual are equivalent for numbers
                expect(value).toBe(4);
                expect(value).toEqual(4);
            });
        ```
        For floating point numbers
        ```javascript
        test('adding floating point numbers', () => {
            const value = 0.1 + 0.2;
            //expect(value).toBe(0.3);This won't work because of rounding error
            expect(value).toBeCloseTo(0.3); // This works.
        });
        ```

    - Strings
        ```javascript
        test('there is no I in team', () => {
            expect('team').not.toMatch(/I/);
            });

        test('but there is a "stop" in Christoph', () => {
            expect('Christoph').toMatch(/stop/);
        });
        ```

    - Arrays 
        ```javascript
        const shoppingList = [
            'diapers',
            'kleenex',
            'trash bags',
            'paper towels',
            'beer',
        ];

        test('the shopping list has beer on it', () => {
            expect(shoppingList).toContain('beer');
        });
        ```

