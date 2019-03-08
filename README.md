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

To pull the latest repository from a branch, issue:

```git pull origin master```

Or you can set up it so that your local master branch tracks github master branch as an upstream:

```git branch --set-upstream-to=origin/master master```

Now you can easily pull the latest repository:

```git pull```
