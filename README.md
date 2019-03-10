# TrafficFlowAPI

Provides a traffic flow information for the routes.

## Dependencies
* **Express:** Create a REST API
* **Joi:** Validate incoming input
* **Axios:** Make HTTP/S requests
* **Winston:** Log relevant information
* **Config:** Configure application variables
* **Morgan:** Log HTTP calls


## Project Structure
* **config** App configuration filesc
* **routes** 
  - **controllers** Request managers
  - **middlewares** Request middlewares
  - **routes.js**  Define routes and middlewares here
* **services** External services implementation 
* **db** Data access stuff
* **core** Business logic implementation
* **utils** Util libs (formats, validation, etc)
* **tests** Testing
* **scripts** Standalone scripts for dev uses
* **package.json**
* **README.md**
* **app.js** App starting point





## Miscallenous 

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