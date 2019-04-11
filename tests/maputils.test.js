import MapUtils from "../src/utils/map";
import logger from "../src/utils/logger";

const coord1 = {
  lat: 40.9562591,
  long: 29.1097512
};

const coord2 = {
  lat: 40.9575284,
  long: 29.1126983
};

describe("MapUtils", () => {
  test("should calculate the distance between two coordinates", () => {
    const distance = MapUtils.getDistance(coord1, coord2);
    console.log(
      `Distance between ${JSON.stringify(coord1)}-${JSON.stringify(
        coord2
      )}: ${distance}`
    );
    expect(distance).toBeDefined();
    expect(distance).toBeGreaterThan(275);
    expect(distance).toBeLessThan(290);
  });
});

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
