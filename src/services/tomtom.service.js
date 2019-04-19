import axios from "axios";
import config from "config";
import MapUtils from "../utils/map.utils";
import logger from "../utils/logger";

/**
 * TomTom related default parameters
 */
const tomtomTrafficAPIVersionNumber = config.get(
  "TomTom.Traffic.versionNumber"
);
const tomtomTrafficZoomLevel = config.get("TomTom.Traffic.DefaultParams.zoom");
const tomtomTrafficReturnFromat = config.get(
  "TomTom.Traffic.DefaultParams.format"
);
const tomtomTrafficStyle = config.get("TomTom.Traffic.DefaultParams.style");
const tomtomMapAPIVersionNumber = config.get("TomTom.Map.versionNumber");
const tomtomMapFormat = config.get("TomTom.Map.DefaultParams.format");
const tomtomMapStyle = config.get("TomTom.Map.DefaultParams.style");
const tomtomMapLayer = config.get("TomTom.Map.DefaultParams.layer");
const tomtomMapTileSize = config.get("TomTom.Map.DefaultParams.tileSize");
const tomtomMapView = config.get("TomTom.Map.DefaultParams.view");
const tomtomMapLanguage = config.get("TomTom.Map.DefaultParams.language");
let tomtomAppKey;

/**
 * Retrieve TomTom credentials
 */
if (config.has("TOMTOM_API_KEY"))
  tomtomAppKey = config.get("TOMTOM_API_KEY").toString();
else if (process.env.TOMTOM_API_KEY) tomtomAppKey = process.env.TOMTOM_API_KEY;
else logger.warn(config.get("Mlg.Warnings.MissingTomTomAPIKey"));

/**
 * TODO
 * `zoom` is replaced by the default zoom at the beginning. The client might provide one?
 */
let tomtomTrafficBaseURL = config
  .get("TomTom.Traffic.APIEndpointTemplate")
  .replace("versionNumber", tomtomTrafficAPIVersionNumber)
  .replace("layer", tomtomMapLayer)
  .replace("style", tomtomTrafficStyle)
  .replace("zoom", tomtomTrafficZoomLevel)
  .replace("format", tomtomTrafficReturnFromat);

let tomtomMapBaseURL = config
  .get("TomTom.Map.APIEndpointTemplate")
  .replace("versionNumber", tomtomMapAPIVersionNumber)
  .replace("format", tomtomMapFormat)
  .replace("layer", tomtomMapLayer)
  .replace("style", tomtomMapStyle);

let tomtomRouteBaseURL = config.get("TomTom.Route.APIEndpointTemplate");

logger.info("tomtomTrafficBaseURL has been set up: " + tomtomTrafficBaseURL);
logger.info("tomtomMapBaseURL has been set up: " + tomtomMapBaseURL);
logger.info("tomtomRouteBaseURL has been set up: " + tomtomRouteBaseURL);

export default class TomTomAPIWrapper {
  /**
   * Given a `coord`, calls TomTom API for the flow information of the given coordinate
   * and then returns a `TomTomFlowSegmentData` object containing the flow information
   * @param {Coordinate} coord - Must be a `Coordinate` containing `lat` and `long`. Coordinates are expected as parameters during a request.
   * @returns {Promise<TomTomFlowSegmentData>} Returns a promise of the flow segment data
   */
  static async getFlowInfoCoord(coord) {
    logger.info(
      "Executing GET Request from getFlowInfoCoord " +
        tomtomTrafficBaseURL +
        " - " +
        JSON.stringify(coord)
    );
    return new Promise((resolve, reject) => {
      /**
       * Make a request to TomTom API with the given coordinate
       */
      axios
        .get(tomtomTrafficBaseURL, {
          params: {
            key: tomtomAppKey,
            point: `${coord.lat},${coord.long}`
          }
        })
        .then(response => {
          logger.info("GOT Response -getFlowInfoCoord-: " + response);
          /**
           * Reject if the response from TomTom is not OK
           */
          if (response.status !== 200) {
            logger.warn(
              "[getFlowInfoCoord] Response status is " + response.status
            );
            /**
             * Should we resolve with null, when we have a response wity non-200 response code?
             */
            reject({
              error: new Error(
                "Response from TomTomFlow has a non-200 status = notOK"
              ),
              statusCode: response.status
            });
          }
          /**
           * Parse and transfer the useful information from the returned information and return it
           */
          let tomtomFlowSegmentData = TomTomUtils.storeFlowSegmentData(
            response.data
          );
          logger.info(`Response data -getFlowInfoCoord-}`);
          resolve(tomtomFlowSegmentData);
        })
        .catch(error => {
          logger.error(
            `Error occured during GET request of getFlowInfoCoord. Request to coord: ${JSON.stringify(
              coord
            )}` +
              `Details: ${error}` +
              `Stack: ${error.stack}`
          );
          if (error.response && error.response.status)
            reject({
              error: new Error(
                "Response from TomTom API has a non-200 status code"
              ),
              statusCode: error.response.status
            });
          else
            reject({
              error: new Error("Unknown error occured during TomTom API call")
            });
        });
    });
  }

  /**
   *  Given a `Coordinate` and an options {`zoom`} arguments, returns the corresponding tile image stream.
   * @param {Coordinate} coord - Must be a pair of numbers containing `lat` and `long`. They will be converted to a zoom, xtile, yile triplet.
   * @param {TomTomMapTileRequestOptions} options - Options to be used before and during making a request to TomTom Map Tile API
   * @returns {Promise<axios.response.data>} A data stream containing the image of the tile at a given zoom. Should be used to pipe to another stream e.g., writeStream, or express response stream
   */
  static async getTileImage(coord, options = {}) {
    /**
     * Get Tile of the given coordinate at a specific zoom level.
     * Then construct the endpoint URL with the returned tile.
     */
    const tile = MapUtils.convertCoordToTile(coord, options.zoom);
    const targetTileURL = tomtomMapBaseURL
      .replace("XTILE", tile.xtile)
      .replace("YTILE", tile.ytile)
      .replace("zoom", tile.zoom);

    logger.info(
      `Executing GET Request from getTileImage to ${targetTileURL}` +
        ` with ${JSON.stringify(tile)}`
    );

    return new Promise((resolve, reject) => {
      axios
        .get(targetTileURL, {
          responseType: "stream",
          params: {
            key: tomtomAppKey,
            language: tomtomMapLanguage
          }
        })
        .then(response => {
          logger.info(
            `Got response -getTileImage-: ${response} with status code: ${
              response.status
            }`
          );
          // Reject if the response is not OK
          if (response.status !== 200)
            reject({
              error: new Error(
                "Response from TomTomTile has a non-200 status = notOK"
              ),
              statusCode: response.status
            });

          resolve(response.data);
        })
        .catch(error => {
          logger.error(
            `Error occured during GET request of getTileImage: ${error}` +
              ` Stack: ${error.stack}`
          );
          if (error.response && error.response.status)
            reject({
              error: new Error(
                "Response from TomTom API has a non-200 status code"
              ),
              statusCode: error.response.status
            });
          else
            reject({
              error: new Error("Unknown error occured during TomTom API call")
            });
        });
    });
  }

  /**
   * Given a start and end coordinate, calculates the route in between
   * @param {Coordinate} sourceCoord - Starting point
   * @param {Coordinate} destCoord - Destination point
   * @returns {Promise<TomTomRoute>} - A list of coordinates and a summary
   *  that defines the route.
   */
  static async getRoute(sourceCoord, destCoord) {
    /**
     * Construct the URL for calculateRoute endpoint
     * calculateRoute/souce.lat,source.long:dest.lat,dest.long/json
     */
    const coordParam =
      sourceCoord.lat +
      "," +
      sourceCoord.long +
      ":" +
      destCoord.lat +
      "," +
      destCoord.long;
    const tomtomCalcRouteURL = tomtomRouteBaseURL.replace(
      "SOURCE_DEST",
      coordParam
    );
    logger.info(`GET request from -getRoute- to :${tomtomCalcRouteURL}`);
    return new Promise((resolve, reject) => {
      axios
        .get(tomtomCalcRouteURL, {
          params: {
            key: tomtomAppKey,
            traffic: false
          }
        })
        .then(response => {
          logger.info(`Received response TomTomService/getRoute`);
          /**
           * Parse incoming JSON data.
           * Note that the returned value might contain empty arrays
           * e.g., `routes`, `legs`.
           */
          const routes = (response.data || {}).routes || [];
          if (routes.length === 0)
            reject(new Error("response.data.routes has length 0"));

          const legs = routes[0].legs;
          if (legs.length === 0)
            reject(new Error("response.data.routes.legs has length 0"));

          const points = legs[0].points;
          /**
           * TomTom returns points with latitude and longitute properties.
           * Map them to our internal presentation format (lat, long).
           */
          let coordinates = points.map(coord => {
            return { lat: coord.latitude, long: coord.longitude };
          });
          resolve({
            summary: response.data.routes[0].legs[0].summary,
            points: coordinates
          });
        })
        .catch(error => {
          logger.error(
            `Error occured during TomTom Route API call -getRoute` +
              `error: ${error}, statusCode: ${error.response &&
                error.response.statusCode}` +
              ` stack: ${error.stack}`
          );
          if (error.response && error.response.status)
            reject({
              error: new Error(
                "Response from TomTom API has a non-200 status code"
              ),
              statusCode: error.response.status
            });
          else
            reject({
              error: new Error("Unknown error occured during TomTom API call")
            });
        });
    });
  }
}

class TomTomUtils {
  /**
   * Parses the incoming flow data from TomTom into a more convenient json format
   * @param {axios.response.data} data - Data containing the traffic flow information of the given coordinate
   * @returns {TomTomFlowSegmentData}
   */
  static storeFlowSegmentData(data) {
    const destObject = {};
    if (data === null || data === undefined) return destObject;
    data = data.flowSegmentData;
    destObject.frc = data.frc;
    if (config.has(`TomTom.${data.frc}`))
      destObject.roadDescription = config.get(`TomTom.${data.frc}`);
    else destObject.roadDescription = data.frc;
    destObject.currentSpeed = data.currentSpeed;
    destObject.freeFlowSpeed = data.freeFlowSpeed;
    destObject.currentTravelTime = data.currentTravelTime;
    destObject.freeFlowTravelTime = data.freeFlowTravelTime;
    destObject.confidence = data.confidence;
    const tmpCoords = Array(data.coordinates.coordinate)[0];
    destObject.nbrOfCoords = tmpCoords.length;
    destObject.coordinates = [];
    tmpCoords.forEach(coord => {
      destObject.coordinates.push({
        lat: coord.latitude,
        long: coord.longitude
      });
    });
    return destObject;
  }
}

/**
 * Represents a GPS coordinate
 * @typedef Coordinate
 * @property {number} lat  - The latitude of the given coordinate
 * @property {number} long - The longitude of the given coordinate
 * @property {string} markerFillColor -What color this marker should be filled with. Should be defined as hex
 * @property {number} trafficJam
 */

/**
 * Represents the Flow Information object of a given coordinate
 * @typedef TomTomFlowSegmentData
 * @property {string} frc - functional road class
 * @property {string} roadDescription - The description of the road, depends on the `frc`
 * @property {number} currentSpeed - Current speed of the road
 * @property {number} freeFlowSpeed - Free flow speed of the road
 * @property {number} currentTravelTime - Current travel time of the road
 * @property {number} freeFlowTravelTime - Free flow travel time of the road
 * @property {number} confidence - Confidence of the speed and time information
 * @property {number} nbrOfCoords - Length of the `coordinates` list
 * @property {Coordinate[]} coordinates - Coordinate array, a line through the direction of the road, starting from the given coordinate
 */

/**
 * @typedef TomTomRoute
 * @property {string} summary
 * @property {Coordinate[]} points
 */

/**
 *
 * @typedef TomTomMapTileRequestOptions
 * @property {number} zoom - Will be used during conversion from coordinate to xtile/ytile
 */

/**
 * Represents a Tile object
 * @typedef Tile
 * @property {number} zoom - The zoom level of the tile to be rendered
 * @property {number} xtile - The x coordinate of the tile on a zoom grid
 * @property {number} ytile - The y coordinate of the tile on a zoom grid
 */

/**
 * @typedef AxiosResponseError
 * @typedef {error} error - The actual error
 * @typedef {number} statusCode - The status code. Gives more information about the cause of the error
 */
