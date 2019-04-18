import TomTomAPIWrapper from "../../services/tomtom.service";
import HereAPIWrapper from "../../services/here.service";
import HereUtils from "../../utils/here.utils";
import MapUtils from "../../utils/map.utils";
import Validator from "../middleware/validator.mw";
import axios from "axios";
import logger from "../../utils/logger";
import Joi from "joi";
import config from "config";

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

const INTERNAL_ERROR_MSG = config.get("Mlg.Warnings.InternalError");
const MALFORMED_PARAM_MSG = config.get("Mlg.Warnings.MalformedParameters");

logger.info(
  `DISTANCE_THRESHOLD_INTRACITY is set to ${DISTANCE_THRESHOLD_INTRACITY} meters`
);
logger.info(
  `DISTANCE_THRESHOLD_INTERCITY is set to ${DISTANCE_THRESHOLD_INTERCITY} meters `
);
logger.info(`MAX_CITY_DISTANCE is set to ${MAX_CITY_DISTANCE} meters`);
logger.info(`MAX_DISTANCE is set to ${MAX_DISTANCE} meters`);

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
   * coordinates. If `repeat` value is greater than 1, then it picks up the last coordinate
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
      res.status(400).send("-coord- query parameter is missing");
      return;
    }
    // Parse input coordinate into lat, long
    const coordList = req.query.coord.split(",");

    let validateQuery = {
      lat: coordList[0],
      long: coordList[1],
      zoom: req.query.zoom,
      repeat: req.query.repeat
    };
    /**
     * Validate the input data
     */
    Validator.AvlTrajectoryParamValidator.validate(
      validateQuery,
      async (validError, value) => {
        if (validError) {
          logger.error(
            `Validation failed inside -apiGetTrajectoryFigure-: ${validError}`
          );
          res.send(MALFORMED_PARAM_MSG);
          return;
        }

        try {
          let tomtomFlowSegmentData,
            routes = [];
          // if the client doesn't provide a `repeat` parameter
          logger.info(`Repeating trajectory for ${value.repeat} times.`);
          let currentCoord = {
            lat: value.lat,
            long: value.long
          };
          /**
           * Request flow information `repeatTrajectory` times to get the trajectory of the route.
           * Unfortunately we can't request all of the coordinates at once as we need to retrieve
           * the succeeding flow information.
           */
          for (let i = 0; i < value.repeat; i++) {
            tomtomFlowSegmentData = await TomTomAPIWrapper.getFlowInfoCoord({
              lat: currentCoord.lat,
              long: currentCoord.long
            });
            logger.info(`Iter #${i + 1}: Received: ${tomtomFlowSegmentData}`);
            routes.push({ coords: tomtomFlowSegmentData.coordinates });
            // Get the last coordinate of the current trajectory
            currentCoord =
              tomtomFlowSegmentData.coordinates[
                tomtomFlowSegmentData.coordinates.length - 1
              ];
          }

          // Request a multiple route figure
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
   * /api/v1/avl/route/figure
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

    /**
     * Parse incoming query parameters
     * - `height` Image height
     * - `width` Image width
     * - `source` Source coordinate
     * - `dest` Destination coordinate
     * - `disth` Distance threshold. How far should the consecutive poitns be?
     * - `lineColor` Color of the route
     * - `lineWidth` Width of the route in pixels
     */
    let validateQuery = {
      height: req.query.height,
      width: req.query.width,
      disth: req.query.disth,
      lineColor: req.query.lc,
      lineWidth: req.query.lw
    };

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

    // Validate incoming data
    Validator.AvlRouteFigureParamValidator.validate(
      validateQuery,
      async (validError, value) => {
        if (validError) {
          logger.error(
            `Validation failed inside -apiGetRouteFigure(avl)- :${validError}` +
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
          /**
           * Reduce route coordinates if the client wants to render markers in order
           * not to run out of markers.
           */
          let filteredCoordinates;
          if (req.query.useMarker)
            filteredCoordinates = MapUtils.diluteRoutePoints(
              routeResult,
              value.disth
            );
          else filteredCoordinates = routeResult.points;
          /**
           * Pack the returned list of points into a Route object
           * because getRouteFigureFromCoords expects so.
           *
           */
          HereAPIWrapper.getSingleRouteFigure(
            {
              coords: filteredCoordinates,
              lineColor: value.lineColor,
              lineWidth: value.lineWidth
            },
            {
              useMarker: req.query.useMarker,
              height: value.height,
              width: value.width
            }
          )
            .then(hereFigureResult => {
              hereFigureResult.pipe(res);
            })
            .catch(hereFigureError => {
              logger.error(
                `An error occured during hereFigure call: ${hereFigureError}` +
                  `, stack: ${hereFigureError.stack}`
              );
              res.status(500).send(INTERNAL_ERROR_MSG);
            });
        } catch (error) {
          logger.error(
            `Error occured inside -apiGetRouteFigure: ${error}` +
              `, stack: ${error.stack}`
          );
          res.status(500).send(INTERNAL_ERROR_MSG);
        }
      }
    );
  }

  /**
   * @todo Filter out the coordinates of a route, remove the ones that are too close
   * to each other. Specify a parameter that the end user can define (in a predefined
   * range) then make sure that the consecutive coordinates have at least the given
   * distance.
   */
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

    // Validate incoming data
    Validator.SourceDestParamValidator.validate(
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

        /**  Check if distance is not too large. Larger distances tend to produce more points which in turn
         *   results in many requests to TomTom Flow endpoint most of which will fail.
         */
        const distance = MapUtils.getDistance(value.source, value.destination);
        logger.debug(`Distance is calculated: ${distance}`);
        if (distance >= MAX_DISTANCE) {
          res
            .status(400)
            .send(
              "Distance is too large. Try requesting smaller portions of the route when neeeded."
            );
          return;
        }

        /**
         * Get the distance threshold value to be used to separate consecutive coordinates
         */
        const distanceThresholdRoute = MapUtils.getDistanceThreshold(
          value.source,
          value.destination
        );

        // Get a route between the source and destination coordinates
        try {
          const routeResult = await TomTomAPIWrapper.getRoute(
            value.source,
            value.destination
          );
          // Dilute the coordinates by filtering out close points
          const pointFlowPromList = await MapUtils.diluteRoutePointsWorker(
            routeResult,
            TomTomAPIWrapper.getFlowInfoCoord,
            distanceThresholdRoute
          );
          /* Transform Promise.all to Promise.almost to make the Promise list robust to errors
           * A few request failures out of tens of requests are negligible
           */
          const promiseAlmost = getPromiseAlmost(pointFlowPromList);
          let responseData = { coords: [] };
          promiseAlmost
            .then(flowInfoList => {
              flowInfoList.forEach(flowInfo => {
                if (flowInfo.failure) {
                  logger.warn(`Something went wrong ${responseData}`);
                  return;
                }
                // Check if flowInfo has information
                if (!flowInfo.coordinates) {
                  logger.warn(`${flowInfo} doesn't have any info`);
                  return;
                }
                /**
                 *  Construct responseData and push. flowInfo.coordinates[0] is the first of the
                 *  points list as it is the requested coordinate.
                 */
                responseData.coords.push({
                  coord: flowInfo.coordinates[0],
                  freeFlowSpeed: flowInfo.freeFlowSpeed,
                  currentSpeed: flowInfo.currentSpeed,
                  currentTravelTime: flowInfo.currentTravelTime,
                  freeFlowTravelTime: flowInfo.freeFlowTravelTime,
                  confidence: flowInfo.confidence,
                  frc: flowInfo.frc
                });
              });
              logger.info(`Total number of request: ${flowInfoList.length}`);
              res.json(responseData);
            })
            .catch(error => {
              logger.error(
                `An error occured during multiple flow requests to TomTom ${error}` +
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
          res.status(500).send("Internal error occured.");
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
