import TomTomAPIWrapper from "../../services/tomtom.service";
import HereAPIWrapper from "../../services/here.service";
import axios from "axios";
import logger from "../../utils/logger";
import HereUtils from "../../utils/here.utils";
import Joi from "joi";

/**
 * A Joi Validation Schema to be used againts TomTom's Flow API Requests.
 * - `lat`: latitude is required
 * - `long`: longitute is required
 * - `zoom`: zoom is optional. must be in the range of [0, 22]
 */
const TomTomFlowJoiSchema = {
  lat: Joi.number().required(),
  long: Joi.number().required(),
  zoom: Joi.number()
    .min(0)
    .max(22),
  repeat: Joi.number()
    .min(1)
    .max(25)
};

export default class AvlTrafficLayerController {
  /**
   * Request must contain a coord parameter.
   * Returns a figure image containing the trajectory of the coordinate.
   * @param {Express.Request}
   * @param {Express.Response}
   * @param {Express.next}
   */
  static async apiGetTrajectoryFigure(req, res, next) {
    logger.info(
      `apiGetTrajectoryFigure got request: ${req.path} params: ${JSON.stringify(
        req.params
      )} query: ${JSON.stringify(req.query)}`
    );
    // 400 if the client does not provide a coordinate
    if (!req.query.hasOwnProperty("coord")) {
      res.status(400).send("Provide a coordinate -coord-");
      return;
    }
    // Parse input coordinate into lat, long
    const coordList = req.query.coord.split(",");
    if (coordList.length < 2) {
      res.status(400).send("-coord- query parameter is malformed");
      return;
    }
    let validateQuery = {
      lat: coordList[0],
      long: coordList[1],
      zoom: req.query.zoom,
      repeat: req.query.repeat
    };
    /**
     * Validate the inpute data
     */
    Joi.validate(
      validateQuery,
      TomTomFlowJoiSchema,
      async (validError, value) => {
        if (validError) {
          logger.error(
            `Validation failed inside -apiGetTrajectoryFigure-: ${validError}`
          );
          res.send("Invalid input. Details: " + validError);
          return;
        }

        try {
          let tomtomFlowSegmentData,
            routes = [];
          const repeatTrajectory = value.repeat || 1;
          logger.info(`Repeating trajectory for ${repeatTrajectory}`);
          let currentCoord = {
            lat: value.lat,
            long: value.long
          };
          for (let i = 0; i < repeatTrajectory; i++) {
            tomtomFlowSegmentData = await TomTomAPIWrapper.getFlowInfoCoord({
              lat: currentCoord.lat,
              long: currentCoord.long
            });
            logger.info(`Iter #${i + 1}: Received: ${tomtomFlowSegmentData}`);
            routes.push({ coords: tomtomFlowSegmentData.coordinates });
            currentCoord =
              tomtomFlowSegmentData.coordinates[
                tomtomFlowSegmentData.coordinates.length - 1
              ];
          }

          HereAPIWrapper.getMultipleRouteFigure({
            routes
          })
            .then(response => {
              logger.info(`HERE Api Wrapper returned sending figure`);
              res.type("png");
              response.pipe(res);
            })
            .catch(error => {
              logger.error(
                `An error occured inside -apiGetTrajectoryFigure-: Details: ${error}, ${
                  error.stack
                }`
              );
              res.status(500).send("Service is currently not functioning");
            });
        } catch (error) {
          logger.error(
            `An internal error occured during TomTomFlowSegmentData request from apiGetTrajectoryFigure. Details: ${error}` +
              `, stack: ${error.stack}`
          );
          res.status(500).send("Service is currently not functioning");
          return;
        }
      }
    );
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
