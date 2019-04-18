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

const hereRouteFigureLineColor = config.get(
  "Here.RouteDisplay.DefaultParams.lineColor"
);
const hereRouteFigureHeight = config.get(
  "Here.RouteDisplay.DefaultParams.height"
);
const hereRouteFigureWidth = config.get(
  "Here.RouteDisplay.DefaultParams.width"
);
const hereRouteFigureLineWidth = config.get(
  "Here.RouteDisplay.DefaultParams.lineWidth"
);

const TrafficHexColors = {
  red: config.get("Here.RouteDisplay.DefaultParams.Colors.red"),
  orange: config.get("Here.RouteDisplay.DefaultParams.Colors.orange"),
  yellow: config.get("Here.RouteDisplay.DefaultParams.Colors.yellow"),
  green: config.get("Here.RouteDisplay.DefaultParams.Colors.green")
};

logger.info(
  `HERE API Default Params: \n\theight: ${hereRouteFigureHeight}\n\twidth:` +
    `${hereRouteFigureWidth}\n\tlineColor: ${hereRouteFigureLineColor}`
);

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
  /** Given a `routeList`, returns a Promise that is trying to resolve an image figure stream
   *  containing the route.
   * @param {Route} route
   * @param {object} options - Options to be used during the URL construction
   * of the URL query
   *  - useMarker: If true, uses points to draw markers rather than a route line
   *  - height: Height of the figure in pixels
   *  - width: Width of the figure in pixels
   * @returns {Promise<axios.response.data>} A data stream containing the corresponding route image
   */
  static async getSingleRouteFigure(route, options = { useMarker: false }) {
    // Validate
    if (!route)
      return new Promise((_, reject) =>
        reject(
          new Error("`route` argument of getSingleRouteFigure is undefined")
        )
      );

    // Get the first route
    const routeCoords = route.coords;
    /**
     * Construct the POST request data. Can't use GET here since the URL length grows with respect
     * to the route length/#ofcoordinates.
     * - `mlbl` stands for marker label. 0 by default which tells HERE to label markers numerically.
     *    1 is for alphabetical labelling.
     * - `h` and `w` stands for height and width.
     */
    let txt;
    if (options.useMarker) {
      txt = "m=" + HereUtils.convertCoordsToString(routeCoords);
    } else {
      txt =
        "r=" +
        HereUtils.convertCoordsToString(routeCoords) +
        "&m=" +
        HereUtils.getSourceDestinationCoords(routeCoords, "string");
    }
    /**
     * Set up optional parameters
     */
    const lineColor = route.lineColor || hereRouteFigureLineColor;
    const figureHeight = options.height || hereRouteFigureHeight;
    const figureWidth = options.width || hereRouteFigureWidth;
    const lineWidth = route.lineWidth || hereRouteFigureLineWidth;
    txt +=
      "&lc=" +
      lineColor +
      "&h=" +
      figureHeight +
      "&w=" +
      figureWidth +
      "&lw=" +
      lineWidth +
      "&mlbl=0";

    logger.info(
      "Executing GET Request from -getRouteFigureFromCoords- to " +
        hereRouteEndpointURL +
        ` txt: ${txt}, options: ${JSON.stringify(options)}`
    );

    return new Promise((resolve, reject) => {
      axios
        .post(hereRouteEndpointURL, txt, {
          responseType: "stream",
          params: {
            app_id: hereAppID,
            app_code: hereAppCode
          }
        })
        .then(response => {
          logger.info("getRouteFigureFromCoords got response");
          resolve(response.data);
        })
        .catch(error => {
          logger.error(
            `getRouteFigureFromCoords get request returned with error: ${error}` +
              `, statusCode = ${error.response && error.response.status}` +
              `, stack: ${error.stack}`
          );
          if (error.response && error.response.status)
            reject({
              error: new Error(
                "Response from HERE API has a non-200 status code"
              ),
              statusCode: error.response.status
            });
          else
            reject({
              error: new Error("Unknown error occured during HERE API call")
            });
        });
    });
  }

  /**
   * @summary Given a `routeList` object containing a list of routes. Makes a request to
   * the HERE API to get a figure of one or more routes drawn on the map.
   * @param {RouteList} routeList - A list of routes to draw on the map
   * @param {object} options - Options to be used during figure request. 
   * `height` and `width` can be provided independently
   *  - `height`: Result image height in pixels, maximum 2048. Default to 512
   *  - `width`: Result image width in pixels, maximum 2048. Default to 512

   * @returns {Promise<Axios.response.data>}
   */
  static async getMultipleRouteFigure(routeList, options = {}) {
    /**
     * Set up optional parameters
     */
    const lineColor = routeList.routes[0].lineColor || hereRouteFigureLineColor;
    const figureHeight = options.height || hereRouteFigureHeight;
    const figureWidth = options.width || hereRouteFigureWidth;
    const lineWidth = options.lineWidth || hereRouteFigureLineWidth;
    // Set up route `lineColor` and `lineWidth` if not already set.
    routeList.routes.forEach(route => {
      route.lineColor = route.lineColor || lineColor;
      route.lineWidth = route.lineWidth || lineWidth;
    });
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
     * Append general figure related optional parameters rather than the ones that are
     * specific to a single route
     */
    queryParamStr +=
      "&h=" +
      (options.figureHeight || figureHeight) +
      "&w=" +
      (options.figureWidth || figureWidth);

    /**
     * Construct the endpoint URL with the query params and make a GET request
     */
    logger.info(
      `Making a GET Request to ${hereRouteEndpointURL} from getMultipleRouteFigure:  ${queryParamStr}`
    );
    return new Promise((resolve, reject) => {
      axios
        .post(hereRouteEndpointURL, queryParamStr, {
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
            `getMultipleRouteFigure get request returned with error: ${error}` +
              `, statusCode = ${error.response && error.response.status}` +
              `, stack: ${error.stack}`
          );
          if (error.response && error.response.status)
            reject({
              error: new Error(
                "Response from HERE API has a non-200 status code"
              ),
              statusCode: error.response.status
            });
          else
            reject({
              error: new Error("Unknown error occured during HERE API call")
            });
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
 * @property {Route[]} routes - A list of geo-coordinate lists. Each GeoCoordinateList (Route[]) defines a route
 */

/**
 * @typedef SourceDestCoordinates
 * @property {Coordinate} source
 * @property {Coordinate} destination
 */
