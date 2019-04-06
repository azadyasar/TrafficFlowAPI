import axios from "axios";
import config from "config";
import logger from "../utils/logger";
import HereUtils from "../utils/here.utils";

/**
 * HERE Map Services API Credentials
 */
let hereAppID;
let hereAppCode;
let hereRouteEndpointURL;

hereRouteEndpointURL = config.get("Here.RouteDisplay.APIEndpointTemplate");
logger.info(
  `HERE Maps API Route Display Endpoint URL has been set: ${hereRouteEndpointURL}`
);

if (config.has("HERE_APP_ID")) hereAppID = config.get("HERE_APP_ID");
else if (process.env.HERE_APP_ID) hereAppID = process.env.HERE_APP_ID;
else logger.warn(config.get("Mlg.Warnings.MissingHereAppID"));

if (config.has("HERE_APP_CODE")) hereAppCode = config.get("HERE_APP_CODE");
else if (process.env.HERE_APP_CODE) hereAppCode = process.env.HERE_APP_CODE;
else logger.warn(config.get("Mlg.Warnings.MissingHereAppCode"));

export default class HereAPIWrapper {
  /**
   * @param {RouteList} routeList
   * @returns {Promise<axios.response.data>} A data stream containing the corresponding route image
   */
  static async getRouteFigureFromCoords(routeList) {
    logger.info(
      "Executing GET Request from HERE - getRouteFigureFromCoords to " +
        hereRouteEndpointURL
    );
    /**
     * Check incoming routeList if it is processable
     */
    try {
      await HereUtils.checkRouteListArg(routeList);
    } catch (error) {
      logger.error(
        "Got error while validating routeList arg of getRouteFigureFromCoords. Details: " +
          error
      );
      return new Promise((_, reject) => reject(error));
    }
    const routeCoords = routeList.routes[0].coords;
    let lineColor;
    if (routeList.routes[0].lineColor)
      lineColor = routeList.routes[0].lineColor;
    else lineColor = "008000";
    return new Promise((resolve, reject) => {
      axios
        .get(hereRouteEndpointURL, {
          responseType: "stream",
          params: {
            app_id: hereAppID,
            app_code: hereAppCode,
            r: HereUtils.convertCoordsToString(routeCoords),
            lc: lineColor,
            m: HereUtils.getSourceDestinationCoords(routeCoords, "string"),
            h: 512,
            w: 512,
            f: 0
          }
        })
        .then(response => {
          logger.info(
            "getRouteFigureFromCoords got response: " + Object.keys(response)
          );
          resolve(response.data);
        })
        .catch(error => {
          logger.error(
            `getRouteFigureFromCoords get request returned with error: ${error}`
          );
          reject(error);
        });
    });
  }
  /**
   *
   * @param {string} coordList - A list of coordinates separated by comma
   * @returns {Promise<axios.response.data>}
   */
  static async getRouteFigure(coordList) {
    logger.info(
      "Executing GET Request from HERE - getRouteFigure to " +
        hereRouteEndpointURL
    );
    /**
     * Check incoming routeList if it is processable
     */
    return new Promise((resolve, reject) => {
      axios
        .get(hereRouteEndpointURL, {
          responseType: "stream",
          params: {
            app_id: hereAppID,
            app_code: hereAppCode,
            r: coordList,
            lc: "008000",
            m: HereUtils.getSourceDestCoordsFromString(coordList, "string"),
            h: 512,
            w: 512,
            f: 0
          }
        })
        .then(response => {
          logger.info("HereRouteFigure got response: " + Object.keys(response));
          resolve(response.data);
        })
        .catch(error => {
          logger.error(
            `HereRouteFigure get request returned with error: ${error}`
          );
          reject(error);
        });
    });
  }

  /**
   *
   * @param {RouteList} routeList - A list of routes to draw on the map
   * @returns {Promise<Axios.response.data>}
   */
  static async getMultipleRouteFigure(routeList) {
    /**
     * Convert routeList to its corresponding query parameter string
     */
    let queryParamStr;
    try {
      queryParamStr = HereUtils.getQueryParamsForMultipleRoute(routeList);
    } catch (error) {
      return new Promise((_, reject) => {
        reject(error);
      });
    }

    /**
     * Construct the endpoint URL with the query params and make a GET request
     */
    const hereMultipleRouteEndpointURL = hereRouteEndpointURL + queryParamStr;
    logger.info(
      `Making a GET Request to ${hereMultipleRouteEndpointURL} from getMultipleRouteFigure`
    );
    return new Promise((resolve, reject) => {
      axios
        .get(hereMultipleRouteEndpointURL, {
          responseType: "stream",
          params: {
            app_code: hereAppCode,
            app_id: hereAppID
          }
        })
        .then(response => {
          logger.info(`Got response -getMultipleRouteFigure- ${response}`);
          resolve(response.data);
        })
        .catch(error => {
          logger.error(
            `Error occured during GET request of -getMultipleRouteFigure- ${error}`
          );
          reject(error);
        });
    });
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
