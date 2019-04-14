import logger from "../utils/logger";
import MapUtils from "./map";

const DISTANCE_THRESHOLD = 500;

export default class HereUtils {
  /**
   * Checks whether the incoming `RouteList` object is correctly initialized
   * @param {RouteList} routeList
   * @returns {Promise}
   */
  static async checkRouteListArg(routeList) {
    return new Promise((resolve, reject) => {
      if (!routeList) {
        reject(
          new Error(
            "getRouteFigure is called with undefined routeList argument"
          )
        );
      } else if (!routeList.routes) {
        reject(
          new Error(
            "getRouteFigure is called with undefined routeList.geoCoords argument"
          )
        );
      } else if (routeList.routes.length === 0) {
        reject(
          new Error(
            "getRouteFigure is called with empty routeList.geoCoords argument"
          )
        );
      } else resolve();
    });
  }

  /**
   * Given an array of `Coordinate` objects, converts them to `lat1,long1,lat2,...` string.
   * So that it can be used as a query param during requets to HERE API
   * @param {Coordinate[]} coords
   * @param {boolean} reduceCoords - Skip coordinates that are close to each other
   * @returns {string} - A string of coordinates joined as `lat1,long1,lat2,long2,...` to be used as a query parameter
   */
  static convertCoordsToString(coords, reduction = false) {
    if (!coords) throw new Error("coords argument must be defined");
    else if (typeof coords !== "object")
      throw new Error("coord argument must be an object");

    let reduceCoords = [];
    let lastCoordinate = {
      lat: 0,
      long: 0
    };
    if (reduction) {
      coords.forEach(coord => {
        const distance = MapUtils.getDistance(lastCoordinate, coord);
        if (distance < DISTANCE_THRESHOLD) return;
        lastCoordinate = coord;
        reduceCoords.push(coord);
      });
    }

    var coordArray = [];
    reduceCoords.forEach(coord => {
      coordArray.push(coord.lat);
      coordArray.push(coord.long);
    });
    return coordArray.join(",");
  }

  /**
   * Given a list of coordinates returns the source (first element) and destination (last element)
   * either in a `SourceDestCoordinates` type which used `Coordinate` internally or in a string format
   * of `lat1,long1,lat2,long2`
   * @param {Coordinate[]} coords - List of coordinates to look for the source and destination
   * @param {string} returnType - Either `string` or `object`. Representing how the source and
   *  destination coordinates should be returned. `string` by default.
   * @returns {SourceDestCoordinates | string}
   */
  static getSourceDestinationCoords(coords, returnType = "string") {
    switch (returnType) {
      case "string":
        let coordList = [];
        coordList.push(coords[0].lat);
        coordList.push(coords[0].long);
        coordList.push(coords[coords.length - 1].lat);
        coordList.push(coords[coords.length - 1].long);
        return coordList.join(",");
        break;
      case "object":
        const { lat: sourceLat, long: sourceLong } = coords[0];
        const { lat: destLat, long: destLong } = coords[coords.length - 1];
        return {
          source: {
            lat: sourceLat,
            long: sourceLong
          },
          destination: {
            lat: destLat,
            long: destLong
          }
        };
        break;
      default:
        throw new Error(
          `Invalid returnType=${returnType} supplied. Must be either "string" or "object"`
        );
        break;
    }
  }

  /**
   *
   * @param {string} coords - A string of coordinates separated by commas
   * @param {string} returnType - Either `string` or `object`.
   * @returns {SourceDestCoordinates | string}
   */
  static getSourceDestCoordsFromString(coords, returnType = "string") {
    switch (returnType) {
      case "string":
        var coordList = coords.split(",");
        /**
         * Remove element starting from the index 2 until the index `length - 4`
         * Keep only the first and last 2 elements
         */
        coordList.splice(2, coordList.length - 4);
        return coordList.join(",");
        break;
      case "object":
        var coordList = coords.split(",");
        coordList.splice(2, coordList.length - 4);
        return {
          source: {
            lat: coordList[0],
            long: coordList[1]
          },
          destination: {
            lat: coordList[2],
            long: coordList[3]
          }
        };
        break;
      default:
        throw new Error(
          `Invalid returnType=${returnType} supplied. Must be either "string" or "object"`
        );
        break;
    }
  }

  /**
   *
   * @param {Axios.response.query} queryObject - Object containing query params of a query
   * @param {RegExp} regexFilter - Regular Expression that will be used to match with the keys of the `queryObject`
   * @returns {string[]} A list of keys containing the matched keys
   */
  static getMatchingQueryParams(queryObject, regexFilter) {
    let key,
      keys = [];
    for (key in queryObject)
      if (queryObject.hasOwnProperty(key) && regexFilter.test(key))
        keys.push(key);
    return keys;
  }

  /**
   *
   * @param {RouteList} routeList - A list of routes
   * @returns {string} A string containing query parameters to be used when making a request to HERE Route Figure API for multiple routes.
   */
  static getQueryParamsForMultipleRoute(routeList) {
    /**
     * Check if `routeList`, `routeList.routes` are defined and `routeList.routes` has length GT 0
     */
    if (!(routeList && routeList.routes && routeList.routes.length > 0))
      throw new Error("routeList argument is not processable");

    let routeIdx = 0;
    let queryParamStr = "?";
    routeList.routes.forEach(route => {
      /**
       * Check if the `coords` array is filled.
       */
      if (!(route.coords && route.coords.length > 0)) {
        logger.warn(
          `HEREUTILS getQueryParamsForMultipleRoute route.coords for idx=${routeIdx} is empty`
        );
        return;
      }
      queryParamStr = queryParamStr.concat(`r${routeIdx}=`);
      queryParamStr = queryParamStr.concat(
        this.convertCoordsToString(route.coords)
      );
      if (route.lineColor)
        queryParamStr = queryParamStr.concat(
          `&lc${routeIdx}=${route.lineColor}`
        );
      else
        queryParamStr = queryParamStr.concat(
          `&lc${routeIdx}=${this.getRandomColor()}`
        );
      if (route.lineWidth)
        queryParamStr = queryParamStr.concat(
          `&lw${routeIdx}=${route.lineWidth}`
        );
      if (route.markers)
        queryParamStr = queryParamStr.concat(
          `&m${routeIdx}=${this.convertCoordsToString(route.markers)}`
        );
      else
        queryParamStr = queryParamStr.concat(
          `&m${routeIdx}=${this.getSourceDestinationCoords(
            route.coords,
            "string"
          )}`
        );
      if (route.markerFillColor)
        queryParamStr = queryParamStr.concat(
          `&mfc${routeIdx}=${route.markerFillColor}`
        );
      queryParamStr = queryParamStr.concat("&");
      routeIdx++;
    });
    logger.debug(
      `Query Params String has been constructed by MultipleRoute: ${queryParamStr}`
    );
    return queryParamStr;
  }

  static getRandomColor() {
    let letterSet = "0123456789ABCDEF";
    let colorStr = "";
    for (let i = 0; i < 6; ++i)
      colorStr += letterSet[Math.floor(Math.random() * 16)];
    return colorStr;
  }
}

/**
 * Represents a GPS coordinate
 * @typedef Coordinate
 * @property {number} lat  - The latitude of the given coordinate
 * @property {number} long - The longitude of the given coordinate
 */

/**
 *
 * @typedef Route
 * @property {Coordinate[]} coords - A list of geo coordinates
 * @property {Coordinate[]} markers - A list of markers to draw on the route
 * @property {string} lineColor - Color of the route line. Should be defined as hex
 * @property {number} lineWidth - Width of the route line
 * @property {string} markerFillColor - What color the markers should be filled with. Should be defined as hex
 */

/**
 *
 * @typedef RouteList
 * @property {Route[]} routes - A list of geo-coordinate list. Each GeoCoordinateList defines a route
 */

/**
 * @typedef SourceDestCoordinates
 * @property {Coordinate} source
 * @property {Coordinate} destination
 */
