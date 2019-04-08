import TomTomAPIWrapper from "../../services/tomtom.service";
import HereAPIWrapper from "../../services/here.service";
import axios from "axios";
import logger from "../../utils/logger";
import HereUtils from "../../utils/here.utils";
import Joi from "joi";
import { resolve } from "dns";

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

const SourceDestParamValidator = Joi.object({
  source: Joi.object({
    lat: Joi.number().required(),
    long: Joi.number().required()
  }).required(),
  destination: Joi.object({
    lat: Joi.number().required(),
    long: Joi.number().required()
  }).required()
});

function getPromiseAlmost(promiseList) {
  return Promise.all(
    promiseList.map(p =>
      p.catch(e => {
        e.failure = true;
        return e;
      })
    )
  );
}

export default class AvlTrafficLayerController {
  /**
   * @summary Request must contain a coord parameter.
   * Returns a figure image containing the trajectory of the coordinate.
   * First it makes a request to the TomTom Flow API and makes use of the returned
   * coordinates. If `repeat` value is greate than 1. It picks up the last coordianate
   * and makes another TomTom Flow API request, and so on.
   * /api/v1/avl/trajectory
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
          // if the client doesn't provide a `repeat` parameter
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
              logger.info(`HERE Rotue API Wrapper returned a figure`);
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

  /**
   * @summary Given a coordinate pair, makes a request to the TomTom Route API
   * via TomTomService (getRoute), with the following route points, it makes another
   * request to the HERE Route Figure API to get an image of the route
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiGetRouteFigure(req, res, next) {
    logger.info(
      `apiGetRouteFigure got request: ${req.path}` +
        `, params: ${JSON.stringify(req.params)}, query: ${JSON.stringify(
          req.query
        )}`
    );

    // 400 if the client does not provide the source and destination coordinates
    if (
      !req.query.hasOwnProperty("source") ||
      !req.query.hasOwnProperty("dest")
    ) {
      res.status(400).send("-source- and -dest- query parameters are missing");
      return;
    }

    // Parse incoming source and dest coordinates
    let validateQuery = {};
    let tmpCoordList = req.query.source.split(",");
    validateQuery.source = {
      lat: tmpCoordList[0],
      long: tmpCoordList[1]
    };
    tmpCoordList = req.query.dest.split(",");
    validateQuery.destination = {
      lat: tmpCoordList[0],
      long: tmpCoordList[1]
    };

    SourceDestParamValidator.validate(
      validateQuery,
      async (validError, value) => {
        if (validError) {
          logger.error(
            `Validation failed inside -apiGetRouteFigure(avl)- :${validError}` +
              `, stack: ${validError.stack()}`
          );
          res.status(400).send("Malformed query. Fix your parameters");
          return;
        }

        // Get a route between source and destination coordinates
        try {
          const routeResult = await TomTomAPIWrapper.getRoute(
            value.source,
            value.destination
          );
          /**
           * Pack the returned list of points(or route) into RouteList object
           * because getRouteFigureFromCoords expects a RouteList object
           * RouteList {
           *  routes: [
           *    {
           *      coords: [{Coordinate}, ...]
           *    }
           *  ]
           * }
           */
          HereAPIWrapper.getRouteFigureFromCoords({
            routes: [{ coords: routeResult.points }]
          })
            .then(hereFigureResult => {
              hereFigureResult.pipe(res);
            })
            .catch(hereFigureError => {
              logger.error(
                `An error occured during hereFigure call: ${hereFigureError}` +
                  `, stack: ${hereFigureError.stack}`
              );
              res.status(500).send("An internal error occured");
            });
        } catch (error) {
          logger.error(
            `Error occured inside -apiGetRouteFigure: ${error}` +
              `, stack: ${error.stack}`
          );
          res.status(500).send("An internal error occured");
        }
      }
    );
  }

  /**
   * /api/v1/avl/route/flow
   * @summary Given a source and a destination coordinate, returns a list of coordinates
   * that defines a route between them. Each coordinate also includes information
   * such as freeFlowSpeed, currentFlowSpeed, etc.
   * It first makes a request to the TomTom calcRoute endpoint, then uses
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiGetRouteTrafficFlow(req, res, next) {
    logger.info(
      `apiGetRouteTrafficFlow got request: ${req.path}` +
        `, params: ${JSON.stringify(req.params)}, query: ${JSON.stringify(
          req.query
        )}`
    );

    // 400 if the client does not provide the source and destination coordinates
    if (
      !req.query.hasOwnProperty("source") ||
      !req.query.hasOwnProperty("dest")
    ) {
      res.status(400).send("-source- and -dest- query parameters are missing");
      return;
    }

    // Parse incoming source and dest coordinates
    let validateQuery = {};
    let tmpCoordList = req.query.source.split(",");
    validateQuery.source = {
      lat: tmpCoordList[0],
      long: tmpCoordList[1]
    };
    tmpCoordList = req.query.dest.split(",");
    validateQuery.destination = {
      lat: tmpCoordList[0],
      long: tmpCoordList[1]
    };

    SourceDestParamValidator.validate(
      validateQuery,
      async (validError, value) => {
        if (validError) {
          logger.error(
            `Validation failed inside -apiGetRouteTrafficFlow-: ${validError}` +
              `, stack: ${validError.stack}`
          );
          res.status(400).send("Malformed query. Fix your parameters");
          return;
        }

        // Get a route between source and destination coordinates
        try {
          const routeResult = await TomTomAPIWrapper.getRoute(
            value.source,
            value.destination
          );
          let pointFlowPromList = [];
          routeResult.points.forEach(point => {
            logger.debug(`Scanning the coord: ${JSON.stringify(point)}`);
            let prom = TomTomAPIWrapper.getFlowInfoCoord(point);
            pointFlowPromList.push(prom);
          });
          const promiseAlmost = getPromiseAlmost(pointFlowPromList);
          let responseData = { coords: [] };
          promiseAlmost
            .then(flowInfoList => {
              flowInfoList.forEach(flowInfo => {
                if (responseData.failure) {
                  logger.warn(`Something went wrong ${responseData}`);
                  return;
                }
                // Check if flowInfo has information
                if (!flowInfo.coordinates) {
                  logger.warn(`${flowInfo} doesn't have any info`);
                  return;
                }
                responseData.coords.push({
                  coord: flowInfo.coordinates[0],
                  freeFlowSpeed: flowInfo.freeFlowSpeed,
                  currentSpeed: flowInfo.currentSpeed
                });
              });
              res.json(responseData);
            })
            .catch(error => {
              logger.error(
                `An error occured during multiple flow request to TomTom ${error}` +
                  `, stack: ${error.stack}`
              );
              res.status(500).send("Internal error occured.");
              return;
            });
        } catch (error) {
          logger.error(
            `An error occured inside -apiGetRouteTrafficFlow- ${error}` +
              `, stack: ${error.stack}`
          );
          res.send(500).send("Internal error occured.");
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

/**
 * @typedef TomTomRoute
 * @property {string} summary
 * @property {Coordinate[]} points
 */
