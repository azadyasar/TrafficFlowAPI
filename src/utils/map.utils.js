import logger from "./logger";
import config from "config";

const EARTH_RADIUS = 6371 * 1000; // in meters

/**
 * Distance threshold between consecutive coordinates for an intracity route
 */
const DISTANCE_THRESHOLD_INTRACITY = config.get(
  "MapUtils.DistanceThresholdIntraCity"
);
/**
 * Distance threshold between consecutive coordinates for an intercity route
 */
const DISTANCE_THRESHOLD_INTERCITY = config.get(
  "MapUtils.DistanceThresholdInterCity"
);
/**
 * How long can a route be in order to be regarded as Intracity? (in KMs)
 */
const MAX_CITY_DISTANCE = 1000 * config.get("MapUtils.MaximumCityDistance");
/**
 * Routes longer than `MAX_DISTANCE` will be discarded. As it takes to much requests
 * to third party APIs. Instead requesting portions of the route when needed is enforced
 * to end users.
 */
const MAX_DISTANCE = 1000 * config.get("MapUtils.MaximumRouteDistance");

logger.info(
  `DISTANCE_THRESHOLD_INTRACITY is set to ${DISTANCE_THRESHOLD_INTRACITY} meters`
);
logger.info(
  `DISTANCE_THRESHOLD_INTERCITY is set to ${DISTANCE_THRESHOLD_INTERCITY} meters `
);
logger.info(`MAX_CITY_DISTANCE is set to ${MAX_CITY_DISTANCE} meters`);
logger.info(`MAX_DISTANCE is set to ${MAX_DISTANCE} meters`);

/**
 * Provides map related utility functions
 */
export default class MapUtils {
  /**
   * Given two coordinates returns the distance between them in meters.
   * Makes use of the Haversine formula
   * @param {Coordinate} coord1 - Source/First/Starting coordinate
   * @param {Coordinate} coord2 - Destination/Second/Ending coordinate
   * @returns {number} - Returns the distance between the given two coordinates
   * in meters.
   */
  static getDistance(coord1, coord2) {
    let latRadius = this.convertDegreeToRadians(coord2.lat - coord1.lat);
    let longRadius = this.convertDegreeToRadians(coord2.long - coord1.long);
    let latRadiusSin = Math.sin(latRadius / 2);
    let longRadiusSin = Math.sin(longRadius / 2);

    let a =
      latRadiusSin * latRadiusSin +
      Math.cos(this.convertDegreeToRadians(coord1.lat)) *
        Math.cos(this.convertDegreeToRadians(coord2.lat)) *
        longRadiusSin *
        longRadiusSin;
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS * c;
  }

  /**
   * Given a coordinate and a desired zoom, returns an object containing zoom, xtile, and ytile of the tile
   * that the given coordinate lies in
   * @param {Coordinate} coord - A `lat` - `long` pair of a coordinate that will be converted to a xtile, ytile at a given zoom.
   * @param {number} zoom - At which zoom level should the conversion be done. Should be in the range of `[0, 22]`
   * @returns {Tile}
   */
  static convertCoordToTile(coord, zoom) {
    logger.debug(`converCoordToTile is called: coord: ${coord}, zoom: ${zoom}`);
    let result = {};
    const n = Math.pow(2, zoom);
    result.xtile = Math.floor(((coord.long + 180) / 360) * n);
    result.ytile = Math.floor(
      ((1 -
        Math.log(
          Math.tan((coord.lat * Math.PI) / 180) +
            1 / Math.cos((coord.lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        n
    );
    result.zoom = zoom;
    return result;
  }

  /**
   * Given a tile, returns a coordinate that resides in the tile. Note that
   * the greater the zoom is, the more precision we have during conversion.
   * @param {Tile} tile - The tile that will be used to produce an appropriate coordinate.
   * @returns {Coordinate}
   */
  static convertTileToCoord(tile) {
    let result = {};
    const n = Math.pow(2, tile.zoom);
    result.long = (tile.xtile / n) * 360.0 - 180;
    const m = Math.Pi - (2 * Math.PI * tile.ytile) / n;
    result.lat =
      (180 / Math.PI) * Math.atan(0.5 * (Math.exp(m) - Math.exp(-m)));
    return result;
  }

  static convertDegreeToRadians(degree) {
    return degree * (Math.PI / 180);
  }

  /**
   * Given a list of points that forms a `TomTomRoute`, filters out the coordinates that are close to each other
   * w.r.t. `distance_threshold`. `callForEachPointFunc` is a function that returns Promise. It is called after
   * each calculated point to speed up the information retrieval.
   * Information about the calculated points will be requested while the rest of the coordinates are being
   * calculated.
   *
   * Details: Scan through all of the points and make sure that consecutive coordinates are at least
   * `DISTANCE_THRESHOLD` meters far away from each other. If this condition fails to hold
   * for two consecutive coordinates, then don't update the lastCoordinate.
   *
   * @param {TomTomRoute} routeResult - Contains a list of coordinates
   * @param {Function} callForEachPointFunc - Function to call for each essential points
   * @param {number} distance_threshold - How much distance should consecutive poitns have?
   * @returns {Promise[]} A list of promises that are created for requests.
   */
  static async diluteRoutePointsWorker(
    routeResult,
    callForEachPointFunc,
    distance_threshold = 250
  ) {
    let pointFlowPromList = [];
    let lastCoordinate = {
      lat: 0,
      long: 0
    };
    let counter = 0;
    routeResult.points.forEach(async point => {
      logger.debug(`Scanning the coord: ${JSON.stringify(point)}`);
      const distance = this.getDistance(lastCoordinate, point);
      if (distance < distance_threshold) {
        logger.debug(
          `Distance ${distance} is less than the threshold ${distance_threshold}`
        );
        return;
      }
      lastCoordinate = point;
      pointFlowPromList.push(callForEachPointFunc(point));
      if (++counter % 50 === 0) await this.sleep(1000);
    });
    return pointFlowPromList;
  }

  /**
   * Decrease the number of coordinates by removing the coordinates that are close to each other
   * Consecutive coordinates should not have a link whose distance is greater than `distance_threshold`
   * @param {TomTomRoute} routeResult
   * @param {number} distance_threshold
   */
  static diluteRoutePoints(routeResult, distance_threshold = 500) {
    let dilutedPoints = [];
    let lastCoordinate = {
      lat: 0,
      long: 0
    };

    routeResult.points.forEach(point => {
      const distance = this.getDistance(lastCoordinate, point);
      if (distance < distance_threshold) {
        logger.debug(
          `Distance ${distance} is less than the threshold ${distance_threshold}`
        );
        return;
      }
      lastCoordinate = point;
      dilutedPoints.push(point);
    });

    return dilutedPoints;
  }

  static sleep(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Given a start and an end coordinate of a route, calculates the distance threshold
   * to be used to determine consecutive coordinates
   * @param {Coordinate} source
   * @param {Coordinate} destination
   */
  static getDistanceThreshold(source, destination) {
    let distanceThresholdRoute;
    /**  If the length of the route is longer than the MAX_CITY_DISTANCE then use
     *   DISTANCE_THRESHOLD_INTERCITY for consecutive coordinate checks.
     */
    const distance = this.getDistance(source, destination);
    if (distance > MAX_CITY_DISTANCE)
      distanceThresholdRoute = DISTANCE_THRESHOLD_INTERCITY;
    else distanceThresholdRoute = DISTANCE_THRESHOLD_INTRACITY;
    return distanceThresholdRoute;
  }
}

/**
 * Represents a GPS coordinate
 * @typedef Coordinate
 * @property {number} lat  - The latitude of the given coordinate
 * @property {number} long - The longitude of the given coordinate
 */

/**
 * Represents a Tile object
 * @typedef Tile
 * @property {number} zoom - The zoom level of the tile to be rendered
 * @property {number} xtile - The x coordinate of the tile on a zoom grid
 * @property {number} ytile - The y coordinate of the tile on a zoom grid
 */

/**
 * @typedef TomTomRoute
 * @property {string} summary
 * @property {Coordinate[]} points
 */