import axios from "axios";
import config from "config";

import logger from "../utils/logger";

/**
 * HERE Map Services API Credentials
 */
let hereAppID;
let hereAppCode;
if (config.has("HERE_APP_ID")) hereAppID = config.get("HERE_APP_ID");
else if (process.env.HERE_APP_ID) hereAppID = process.env.HERE_APP_ID;
else logger.warn(config.get("Mlg.Warnings.MissingHereAppID"));

if (config.has("HERE_APP_CODE")) hereAppCode = config.get("HERE_APP_CODE");
else if (process.env.HERE_APP_CODE) hereAppCode = process.env.HERE_APP_CODE;
else logger.warn(config.get("Mlg.Warnings.MissingHereAppCode"));

import fs from "fs";
const writeStream = fs.createWriteStream(
  require("path").join(__dirname, "/test.png")
);

export default class HereAPIWrapper {
  /**
   * @param {RouteList} routeList
   * @returns {Promise<axios.response.data} A data stream containing the corresponding route image
   */
  static async getRouteFigure(routeList) {
    const hereRouteURL = config.get("Here.RouteDisplay.APIEndpointTemplate");
    logger.info(
      "Executing GET Request from HERE - getRouteFigure to " + hereRouteURL
    );
    /**
     * Check incoming routeList if it is processable
     */
    try {
      await HereUtils.checkRouteListArg(routeList);
    } catch (error) {
      logger.error(
        "Got error while validating routeList arg of getRouteFigure. Details: " +
          error
      );
      return new Promise((_, reject) => reject(error));
    }
    console.log(routeList);
    const routeCoords = routeList.geoCoords[0].coords;
    return new Promise((resolve, reject) => {
      axios
        .get(hereRouteURL, {
          responseType: "stream",
          params: {
            app_id: hereAppID,
            app_code: hereAppCode,
            r: HereUtils.convertCoordsToString(routeCoords),
            lc: "008000",
            m: HereUtils.getSourceDestinationCoords(routeCoords, "string"),
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
}

class HereUtils {
  /**
   *
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
      } else if (!routeList.geoCoords) {
        reject(
          new Error(
            "getRouteFigure is called with undefine routeList.geoCoords argument"
          )
        );
      } else if (routeList.geoCoords.length === 0) {
        reject(
          new Error(
            "getRouteFigure is called with empty routeList.geoCoords argument"
          )
        );
      } else resolve();
    });
  }

  /**
   *
   * @param {Coordinate[]} coords
   * @returns {string} - A string of coordinates joined as `lat1,long1,lat2,long2,...` to be used as a query parameter
   */
  static convertCoordsToString(coords) {
    if (!coords) throw new Error("coords argument must be defined");
    else if (typeof coords !== "object")
      throw new Error("coord argument must be an object");

    var coordArray = [];
    coords.forEach(coord => {
      coordArray.push(coord.lat);
      coordArray.push(coord.long);
    });
    return coordArray.join(",");
  }

  /**
   *
   * @param {Coordinate[]} coords - List of coordinates to look for the source and destination
   * @param {string} returnType - Either `string` or `object`. Representing how the source and
   *  destination coordinates should be returned. `string` by default.
   * @returns {SourceDestCoordinates | string}
   */
  static getSourceDestinationCoords(coords, returnType = "string") {
    switch (returnType) {
      case "string":
        var coordList = [];
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
          `Invalid returnType=${returnType} supplied. Must be "string" or "object"`
        );
        break;
    }
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
 * @typedef GeoCoordinateList
 * @property {Coordinate[]} coords - A list of geo coordinates
 */

/**
 *
 * @typedef RouteList
 * @property {GeoCoordinateList[]} geoCoords - A list of geo-coordinate list. Each GeoCoordinateList defines a route
 */

/**
 * @typedef SourceDestCoordinates
 * @property {Coordinate} source
 * @property {Coordinate} destination
 */
