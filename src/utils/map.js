import logger from "./logger";

const EARTH_RADIUS = 6371 * 1000; // in meters
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
