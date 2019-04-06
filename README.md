# TrafficFlowAPI

Provides a traffic flow information for the routes.

## Dependencies

- **Babel:** To transpile our ES6 JS code into ES5
- **Express:** Create a REST API
- **Joi:** Validate incoming input
- **Axios:** Make HTTP/S requests
- **Winston:** Log relevant information
- **Config:** Configure application variables
- **Morgan:** Log HTTP calls

## Project Structure

- **bin** Application starting points. **_dev_** for development, **_production_** for production.
- **dist** Not tracked. Folder for **babel** to transpile our source code into
- **config** App configuration filesc
- **scripts** Standalone scripts for dev uses
- **src** Source Code
  - **api** Application Programming Interface
    - **controllers** Controllers for corresponding routes/endpoints
    - **middleware** Middleware functions for routes e.g., authorization, logging
    - **routes** Routes/endpoints. Routes will be matched with controllers
  - **core** Business logic implementation
  - **dao** Data Access Objects
  - **services** Util libs (formats, validation, etc.)
- **tests** Testing
- **.env** Environment variables e.g., secret keys, passwords, credentials
- **package.json**
- **README.md**

## AVL Traffic Layer API

### TomTom Related Endpoints

- `/flow` Returns the flow information of the given coordinate. Must provide a **_coord_** query parameter, **_zom_** is optional.
- `/tile` Returns the tile image of the given coordinate. Must provide a **_coord_** query parameter, **_zom_** is optional. A zoom level is required to convert the given coordinate to its corresponding tile as it changes with respect to zoom level. Zoom - **_15_** is used by default

### HERE Maps API Related Endpoints

- `/routeFigure` A route that corresponds to the given coordinate list is drawn on the map and returned as a stream. Must provide a `route` coordinate array as `lat1,long1,lat2,long2,...,latN,longN`.

### AVL Traffic Layer Endpoints

- `/trajectory` A trajectory of the given coordinate is generated with respect to the flow of the road (in which direction the traffic flows to). Returns an image containing the route of the trajectory. Must provide a `coord` as `lat,long`.

## Miscallenous

### How to Run

Issue

`npm start`

for development stage.

Issue

`npm test` or `npm test -t <specific-test>`

for test purposes.

Issue

`npm run production`

for production environment.

### Git Related

To pull the latest repository from a branch, issue:

`git pull origin master`

Or you can set up it so that your local master branch tracks github master branch as an upstream:

`git branch --set-upstream-to=origin/master master`

Now you can easily pull the latest repository:

`git pull`

Use **dev** branch for development purposes

`git checkout dev`

It is wiser to merge two branches inside **dev** first to see if there are conflicts and avoid overriding

**_(on branch dev)_** `git merge master`

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

Winston logger is constructed inside **_utils/logger_** module. The logger prints log messages in the following format `timestamp [label level] message`.

**require** **_./utils/logger_** to have access to logging functions. Custom logger makes use of the following 4 logging levels (the most important to the least):

- error
- warn
- info
- debug

Logged messages will be saved into the **_logs_** folder. Name of the log files are self-explanatory. You should note that a log file will write the incoming log message if the incoming log message has level that is greater than or equal to the level of the log file. To log relevant information, use the following schema in your **js** file.

```javascript
const logger = require("./utils/logger");
// ...
logger.log({
  level: "info",
  message: "Log info"
});
logger.info("log info");
logger.debug("log debug");
logger.warn("log warn");
logger.error("log error");
```

### How to Use Config

It is more convenient to make use of **config** package for several application variable as they might change depending on the machine, requirements, etc. Use the following config files for related variables

- **default.json:** &nbsp; All default variables
- **development.json:** &nbsp; All **_development_** related variables
- **production.json:** &nbsp; All **_production_** related variables
- **custom-environment-variables.json:** &nbsp; All **_environment_** variables. Credentials and other crucial variables should be defined here as environment variables.

Note that custom config files will override **_default.json_** if any variable is defined in both places.

### How to Use Jest

Create your tests under the **_tests_** folder. Name convention is `<test-name>.test.js`. To run a specific test, issue the following command:

```bash
npm test -t <test-name>
```

Here are some common test helpers. For more examples and a hands-on usage set, check out `tests/testing_reference.test.js`.

- **Using Matchers**

  Jest uses "matchers" to let you test values in different ways. This document will introduce some commonly used matchers.

  - **Common Matchers**
    ```javascript
    test("two plus two is four", () => {
      expect(2 + 2).toBe(4);
    });
    ```
    In this code, expect(2 + 2) returns an "expectation" object. You typically won't do much with these expectation objects except call matchers on them. In this code, .toBe(4) is the matcher. When Jest runs, it tracks all the failing matchers so that it can print out nice error messages for you.
    ```javascript
    test("object assignment", () => {
      const data = { one: 1 };
      data["two"] = 2;
      expect(data).toEqual({ one: 1, two: 2 });
    });
    ```
  - **Truthiness**

    In tests you sometimes need to distinguish between undefined, null, and false, but you sometimes do not want to treat these differently. Jest contains helpers that let you be explicit about what you want.

    - **_toBeNull_** matches only null
    - **_toBeUndefined_** matches only undefined
    - **_toBeDefined_** is the opposite of toBeUndefined
    - **_toBeTruthy_** matches anything that an if statement treats as true
    - **_toBeFalsy_** matches anything that an if statement treats as false

    ```javascript
    test("null", () => {
      const n = null;
      expect(n).toBeNull();
      expect(n).toBeDefined();
      expect(n).not.toBeUndefined();
      expect(n).not.toBeTruthy();
      expect(n).toBeFalsy();
    });

    test("zero", () => {
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
    test("two plus two", () => {
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
    test("adding floating point numbers", () => {
      const value = 0.1 + 0.2;
      //expect(value).toBe(0.3);This won't work because of rounding error
      expect(value).toBeCloseTo(0.3); // This works.
    });
    ```

  - Strings

    ```javascript
    test("there is no I in team", () => {
      expect("team").not.toMatch(/I/);
    });

    test('but there is a "stop" in Christoph', () => {
      expect("Christoph").toMatch(/stop/);
    });
    ```

  - Arrays

    ```javascript
    const shoppingList = [
      "diapers",
      "kleenex",
      "trash bags",
      "paper towels",
      "beer"
    ];

    test("the shopping list has beer on it", () => {
      expect(shoppingList).toContain("beer");
    });
    ```

### HERE Map Services

- **The Route Resource**: This resource provides the functionality for the route and route marker representation (no calculation included) on a map image. Multiple routes can be shown on same map and the color and thickness of the drawn route line can be customized. Routes can be drawn as polylines connecting waypoints specified in the request paramters (latitude and longitude pairs). The route waypoints are connected together with a line in the order they are given. The zoom level for the displayed image is determined automatically using the route information and display size (width and height parameters). A given zoom level is only considered if it is smaller than the calculated one to provide a wider view of the map. The route resource endpoint `https://image.maps.api.here.com/mia/1.6/route` has following query parameters.

  | **Parameter**           |      **Type**       | **Description**                                                                                                                                                                                                                                                                                                                                                                                                                                                |
  | ----------------------- | :-----------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | **_f_**                 |       Integer       | Image format. It is possible to request the map image in following formats: <ul><li>0 PNG</li><li>1 JPEG (**_default_**)</li><li>2 GIF</li><li>3 BMP</li><li>4 PNG8</li><li>5 SVG</li></ul>                                                                                                                                                                                                                                                                    |
  | **_h_**                 |       Integer       | Result image height in pixels, maximum 2048. Height and width parameter can be proviced independently                                                                                                                                                                                                                                                                                                                                                          |
  | **_lc,lc0,lc1,..._**    |        Color        | Line color. When presenting only a single route or area/region, the index 0 of the parameter is not required i.e. plain **_lc_** can be used.                                                                                                                                                                                                                                                                                                                  |
  | **_lw,lw0,lw1,..._**    |       Integer       | Line width. When presenting only a single route or area/region, the index 0 of the parameter is not required i.e. plain **_lw_** can be used.                                                                                                                                                                                                                                                                                                                  |
  | **_m,m0,m1,..._**       | Geo Coordinate List | List of geocoordinates for route waypoint marker icon group. Marker point lists have to be distinguished by indexes when showing multiple route marker groups. Consecutive numbering is necessary in indexes and a gap in sequential numbering leads to ignoring of all the subsequent index parameters. For single route marker group the index 0 of the parameter is not required.                                                                           |
  | **_mfc,mfc0,mfc1,..._** |        Color        | Fill color for route markers. This can be used to define common default fill color for all route markers (without index) or routemarker group specific fill color (with index)                                                                                                                                                                                                                                                                                 |
  | **_mlbl_**              |       Integer       | Route marker theme. <ul><li>0 - Numerical</li><li>1 - Alphabetical</li></ul>                                                                                                                                                                                                                                                                                                                                                                                   |
  | **_mthm_**              |       Integer       | Route marker theme. <ul><li>0 - Bubble</li><li>1 - Pin</li><li>2 - HERE style pin</li></ul>                                                                                                                                                                                                                                                                                                                                                                    |
  | **_poi_**               | Geo Coordinate List | List of geo coordinates for Points of Interest.                                                                                                                                                                                                                                                                                                                                                                                                                |
  | **_r,r0,r1,..._**       | Geo Coordinate List | The route waypoints, given as list of geo coordinates. **Note:** For Route, Routes have to be distinguished by index in the parameter name when showing multiple routes on same map i.e. r0, r1 etc. Consecutive numbering is necessary in indexes and a gap in sequential numbering leads to ignoring of all the subsequent index parameters. When presenting only a single route, the index 0 of the parameter is not required i.e. plain **r** can be used. |
  | **_style_**             |       String        | Map style type. <ul><li>alps</li><li>daisy</li><li>dreamworks</li><li>flame</li><li>fleet</li><li>mini</li></ul>                                                                                                                                                                                                                                                                                                                                               |
  | **_t_**                 |       Integer       | Map scheme type. Range is **[0, 14]**. Some important ones are as follows: <ul><li>0 (normal.day)</li><li>1 (satellite.day)</li><li>2 (terrain.day)</li><li>3 (hybrid.day)</li></ul>                                                                                                                                                                                                                                                                           |
  | **_w_**                 |       Integer       | Result image width in pixels, maximum 2048                                                                                                                                                                                                                                                                                                                                                                                                                     |
  | **_z_**                 |        Float        | Zoom level for the map, between **[0,20]**                                                                                                                                                                                                                                                                                                                                                                                                                     |
  |                         |                     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
