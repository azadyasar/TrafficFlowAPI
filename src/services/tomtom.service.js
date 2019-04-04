const axios = require("axios");
const config = require("config");
import MapUtils from "../utils/map";

import logger from "../utils/logger";
// const logger = require("../utils/logger");

let tomtomTrafficAPIVersionNumber = config.get("TomTom.Traffic.versionNumber");
let tomtomTrafficZoomLevel = config.get("TomTom.Traffic.DefaultParams.zoom");
let tomtomTrafficReturnFromat = config.get(
  "TomTom.Traffic.DefaultParams.format"
);
let tomtomTrafficStyle = config.get("TomTom.Traffic.DefaultParams.style");
let tomtomMapAPIVersionNumber = config.get("TomTom.Map.versionNumber");
let tomtomMapFormat = config.get("TomTom.Map.DefaultParams.format");
let tomtomMapStyle = config.get("TomTom.Map.DefaultParams.style");
let tomtomMapLayer = config.get("TomTom.Map.DefaultParams.layer");
let tomtomMapTileSize = config.get("TomTom.Map.DefaultParams.tileSize");
let tomtomMapView = config.get("TomTom.Map.DefaultParams.view");
let tomtomMapLanguage = config.get("TomTom.Map.DefaultParams.language");
let tomtomMapZoomLevel = config.get("TomTom.Map.DefaultParams.zoom");
let tomtomAppKey;

if (config.has("TOMTOM_API_KEY"))
  tomtomAppKey = config.get("TOMTOM_API_KEY").toString();
else if (process.env.TOMTOM_API_KEY) tomtomAppKey = process.env.TOMTOM_API_KEY;
else
  logger.warn(
    "TOMTOM_API_KEY environment variable is not set. Requests to TomTom API will fail."
  );

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

logger.info("tomtomTrafficBaseURL is set up: " + tomtomTrafficBaseURL);
logger.info("tomtomMapBaseURL is set up: " + tomtomMapBaseURL);

export default class TomTomAPIWrapper {
  /**
   *
   * @param {Coordinate} coord - Must be a pair of numbers. Coordinates are expected as parameters during a request.
   * @returns {Promise<TomTomFlowSegmentData>} Returns a promise of the flow segment data
   */
  static async getFlowInfoCoord(coord) {
    let tomtomFlowSegmentData = {};
    logger.info(
      "Executing GET Request from getFlowInfoCoord " +
        tomtomTrafficBaseURL +
        " - " +
        JSON.stringify(coord)
    );
    return new Promise((resolve, reject) => {
      axios
        .get(tomtomTrafficBaseURL, {
          params: {
            key: tomtomAppKey,
            point: `${coord.lat},${coord.long}`
          }
        })
        .then(response => {
          logger.info("GOT Response -getFlowInfoCoord-: " + response);
          if (response.status !== 200) {
            logger.warn(
              "Response status is getFlowInfoCoord " + response.status
            );
            /**
             * Should we resolve with null, when we have a response wity non-200 response code?
             */
            reject(
              new Error(
                "Response status is " +
                  response.status +
                  ` response: ${response}`
              )
            );
          }
          tomtomFlowSegmentData = TomTomUtils.storeFlowSegmentData(
            response.data
          );
          logger.info(
            `Response data -getFlowInfoCoord-: ${JSON.stringify(
              tomtomFlowSegmentData
            )}`
          );
          resolve(tomtomFlowSegmentData);
        })
        .catch(error => {
          console.log(error);
          logger.error(
            `Error occured during GET request of getFlowInfoCoord: ${error}`
          );
          reject(error);
        });
    });
  }

  /**
   *
   * @param {Coordinate} coord - Must be a pair of numbers containing `lat` and `long`. They will be converted to a zoom, xtile, yile triplet.
   * @param {TomTomMapTileRequestOptions} options - Options to be used before and during making a request to TomTom Map Tile API
   * @returns {Promise<axios.response.data>} A data stream containing the image of the tile at a given zoom. Should be used to pipe to another stream e.g., writeStream, or express response stream
   */
  static async getTileImage(coord, options = { zoom: tomtomMapZoomLevel }) {
    /**
     * `undefined` zoom might come from a client's request. It's not checked in the route handler.
     */
    if (options.zoom === undefined || options.zoom === null)
      options.zoom = tomtomMapZoomLevel;
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
          logger.info(`Got response -getTileImage-: ${response}`);
          resolve(response.data);
        })
        .catch(error => {
          logger.error(
            `Error occured during GET request of getTileImage: ${error}`
          );
          reject(error);
        });
    });
  }
}

class TomTomUtils {
  /**
   *
   * @param {axios.response.data} data - Data containing the traffic flow information of the given coordinate
   * @returns {TomTomFlowSegmentData}
   */
  static storeFlowSegmentData(data) {
    const destObject = {};
    if (data === null || data === undefined) return destObject;
    data = data.flowSegmentData;
    destObject.frc = data.frc;
    destObject.roadDescription = config.get(`TomTom.${data.frc}`);
    destObject.currentSpeed = data.currentSpeed;
    destObject.freeFlowSpeed = data.freeFlowSpeed;
    destObject.currentTravelTime = data.currentTravelTime;
    destObject.freeFlowTravelTime = data.freeFlowTravelTime;
    destObject.confidence = data.confidence;
    destObject.coordinates = Array(data.coordinates.coordinate)[0];
    return destObject;
  }
}

/**
 * Represents a GPS coordinate
 * @typedef Coordinate
 * @property {number} lat  - The latitude of the given coordinate
 * @property {number} long - The longitude of the given coordinate
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
 * @property {object[]} coordinates - Coordinate array, a line through the direction of the road, starting from the given coordinate
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
