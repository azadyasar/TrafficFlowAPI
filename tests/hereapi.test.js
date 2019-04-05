import HereAPIWrapper from "../src/services/here.service";
import logger from "../src/utils/logger";

const routeList = {
  geoCoords: [
    {
      coords: [
        {
          lat: 40.97171,
          long: 29.25599
        },
        {
          lat: 40.97192,
          long: 29.24881
        },
        {
          lat: 40.97381,
          long: 29.24544
        },
        {
          lat: 40.9751,
          long: 29.24391
        },
        {
          lat: 40.97776,
          long: 29.22272
        },
        {
          lat: 40.97423,
          long: 29.21892
        },
        {
          lat: 40.96912,
          long: 29.21713
        }
      ]
    }
  ]
};

describe("HereAPI", () => {
  test("should GET a route image from HERE Route ", async () => {
    return HereAPIWrapper.getRouteFigure(routeList)
      .then(responseData => {
        expect(responseData).not.toBeNull();
        expect(responseData).toBeDefined();
      })
      .catch(error => {
        logger.error(error);
        expect(error).toBeUndefined();
      });
  });
});

jest.setTimeout(60000);

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
