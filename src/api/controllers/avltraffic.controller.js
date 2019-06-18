import TomTomAPIWrapper from "../../services/tomtom.service";
import HereAPIWrapper from "../../services/here.service";
import OpenWeatherAPIWrapper from "../../services/openweather.service";
import MapUtils from "../../utils/map.utils";
import Validator from "../middleware/validator.mw";
import logger from "../../utils/logger";
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
 * Routes longer than `MAX_DISTANCE` will be discarded. As it takes too many requests
 * to the third party APIs. Instead of that, requesting the portions of the route when
 * needed is enforced to end users.
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
   * @route api/v1/avl/route
   * @summary Given a coordinate pair, responses with a route between them.
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiGetRoute(req, res, next) {
    logger.info(
      `apiGetRoute [AVL] got request: ${req.path}` +
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

    let validateQuery = {};
    // Source
    let tmpCoordList = req.query.source.split(",");
    validateQuery.source = {
      lat: tmpCoordList[0],
      long: tmpCoordList[1]
    };
    // Destination
    tmpCoordList = req.query.dest.split(",");
    validateQuery.destination = {
      lat: tmpCoordList[0],
      long: tmpCoordList[1]
    };
    // Checkpoints
    tmpCoordList = req.query.checkpoints.split(",");
    const checkpoints = [];
    for (let i = 1; i < tmpCoordList.length; i += 2) {
      checkpoints.push({
        lat: tmpCoordList[i - 1],
        long: tmpCoordList[i]
      });
    }
    logger.info("Checkpoints: ", checkpoints);

    // Validate incoming data
    Validator.SourceDestParamValidator.validate(
      validateQuery,
      async (validError, value) => {
        if (validError) {
          logger.error(
            `Validation failed inside -apiGetRoute(avl)-: ${validError}` +
              `, stack: ${validError.stack}`
          );
          res.status(400).send("Malformed query. Fix your parameters");
          return;
        }

        // Get a route between source and destination coordinates
        TomTomAPIWrapper.getRoute(value.source, value.destination, checkpoints)
          .then(routeResult => {
            res.send(routeResult);
          })
          .catch(error => {
            logger.error(
              `An error occured during route request to TomTom from getRoute of AVL: ${error}` +
                `, stack: ${error.stack}`
            );
            res.status(500).send(INTERNAL_ERROR_MSG);
          });
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
   * /api/v1/avl/route/flow
   * /api/v1/avl/route/flow/figure
   * @summary Given a source and a destination coordinate, calculates a list of coordinates
   * that defines a route between them. Each coordinate also includes information
   * such as freeFlowSpeed, currentFlowSpeed, etc.
   * It first makes a request to the TomTom calcRoute endpoint, then uses the returned
   * coordinates to make another request to retrieve the traffic information.
   *
   * Note that this is the first request handler for Route Flow requests, if this handler
   * ends succesfully then the latter handlers will be called.
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiCalculateRouteTrafficFlow(req, res, next) {
    logger.info(
      `apiCalculateRouteTrafficFlow got request: ${req.path}` +
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
            req.query.disth
          );

          /**
           * Transform Promise.all to Promise.almost to make the Promise list robust to errors
           * A few request failures out of hundredths of requests are negligible
           */
          req.promiseAlmost = getPromiseAlmost(pointFlowPromList);
          /**
           * Call the next request handler funtion
           * - `apiGetRouteTrafficFlow`
           * - `apiGetRouteTrafficFigure`
           */
          next();
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

  /**
   * /api/v1/avl/route/flow
   * @summary This request handler function is preceded by apiCalculateRouteTrafficFlow
   * so when called, it already has the `promiseList` of the flow information requests
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

    let responseData = { coords: [] };
    req.promiseAlmost
      .then(flowInfoList => {
        flowInfoList.forEach(flowInfo => {
          if (flowInfo.failure) {
            logger.warn(`flowInfo is defected ${flowInfo}`);
            return;
          }
          // Check if flowInfo has information
          if (!flowInfo.coordinates) {
            logger.warn(`${flowInfo} doesn't have any flow info`);
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
        res.status(500).send(INTERNAL_ERROR_MSG);
        return;
      });
  }

  /**
   * /api/v1/route/flow/figure
   * @summary Given a source and destination coordinate pair, calculates an optimal route
   * between them, retrieves the flow information of that route and then visualizes the
   * flow information via markers.
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiGetRouteTrafficFigure(req, res, next) {
    logger.info(
      `apigetRouteTrafficFigure got request: ${req.path}` +
        `, params: ${JSON.stringify(req.params)}, query: ${JSON.stringify(
          req.query
        )}`
    );

    /**
     * @type Route
     */
    let route = { coords: [] };
    req.promiseAlmost.then(async flowInfoList => {
      flowInfoList.forEach(flowInfo => {
        if (flowInfo.failure) {
          logger.warn(`flowInfo is defected ${responseData}`);
          return;
        }
        // Check if flowInfo has information
        if (!flowInfo.coordinates) {
          logger.warn(`${flowInfo} doesn't have any flow info`);
          return;
        }
        /**
         *  Construct responseData and push. flowInfo.coordinates[0] is the first of the
         *  points list as it is the requested coordinate.
         */
        route.coords.push({
          lat: flowInfo.coordinates[0].lat,
          long: flowInfo.coordinates[0].long,
          trafficJam: MapUtils.getTrafficJam(flowInfo)
        });
      });
      try {
        const figure = await HereAPIWrapper.getMarkerizedFlowFigure(route, {
          height: req.query.height,
          width: req.query.width
        });
        figure.pipe(res);
      } catch (error) {
        logger.error(error);
        res.status(500).send(INTERNAL_ERROR_MSG);
      }
    });
  }

  /**
   * @todo Should we dilute requested coordinates as we do for the route coords?
   * GET /api/v1/avl/batchFlow
   * @summary Given a batch of coordinates returns their flow information. Coordinates are separated with a comma.
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiGetBatchFlowInfo(req, res, next) {
    logger.info(
      `apiGetBatchFlowInfo is requested: ${req.path}` +
        `, params: ${JSON.stringify(req.params)}, query: ${JSON.stringify(
          req.query
        )}`
    );

    // 400 if the client does not provide a list of coordinates
    if (!req.query.hasOwnProperty("coords")) {
      res.status(400).send("-coords- query parameter is missing");
      return;
    }

    const reqCoordList = req.query.coords.split(",");
    /**  Coordinate list is named as points because we will make use of the dilueRoutePointsWorker
     *  and it expects a TomTomRoute
     */
    reqCoordList.forEach(reqCoord => logger.debug(reqCoord));
    let validateQuery = {
      points: []
    };
    for (let i = 1; i < reqCoordList.length; i += 2) {
      let coord = {};
      coord.lat = reqCoordList[i - 1];
      coord.long = reqCoordList[i];
      validateQuery.points.push(coord);
    }

    logger.debug("Constructed points:");
    validateQuery.points.forEach(point => logger.debug(JSON.stringify(point)));

    Validator.BatchCoordValidator.validate(
      validateQuery,
      async (validError, batchCoord) => {
        if (validError) {
          logger.error(
            `Validation failed inside -apiGetBatchFlowInfo-: ${validError}` +
              `, stack: ${validError.stack}`
          );
          res.status(403).send(MALFORMED_PARAM_MSG);
          return;
        }

        // Dilute the coordinates by filtering out close points
        const pointsFlowPromList = await MapUtils.diluteRoutePointsWorker(
          batchCoord,
          TomTomAPIWrapper.getFlowInfoCoord,
          req.query.disth
        );

        /**
         * Transform Promise.all to Promise.almost to make the Promise list robust to errors
         * A few request failures out of hundredths of requests are negligible
         */
        const promiseAlmost = getPromiseAlmost(pointsFlowPromList);
        let responseData = { timestamp: Date.now(), coordsFlowInfoList: [] };
        promiseAlmost
          .then(flowInfoList => {
            flowInfoList.forEach(flowInfo => {
              if (flowInfo.failure) {
                logger.warn(
                  `-apiGetBatchFlowInfo- flowInfo is defected ${flowInfo}`
                );
                return;
              }
              // Check if flowInfo has information
              if (!flowInfo.coordinates) {
                logger.warn(
                  `-apiGetBatchFlowInfo- ${flowInfo} doesn't have any flow info.`
                );
                return;
              }
              /**
               * Construct responseData and push flowInfo.
               */
              const jamFactor = MapUtils.getTrafficJam(flowInfo);
              responseData.coordsFlowInfoList.push({
                coord: flowInfo.coordinates[0],
                freeFlowSpeed: flowInfo.freeFlowSpeed,
                currentSpeed: flowInfo.currentSpeed,
                currentTravelTime: flowInfo.currentTravelTime,
                freeFlowTravelTime: flowInfo.freeFlowTravelTime,
                confidence: flowInfo.confidence,
                frc: flowInfo.frc,
                jamFactor: jamFactor
              });
            });
            logger.info(
              `#${
                flowInfoList.length
              } of requests has been made from -apiBatchFlowInfo-`
            );
            res.json(responseData);
          })
          .catch(promiseAlmostError => {
            logger.error(
              `An error occured during multiple flow requests to TomTom from -apiBatchFlowInfo: ` +
                `${promiseAlmostError}, stack: ${promiseAlmostError.stack}`
            );
            res.status(500).send(INTERNAL_ERROR_MSG);
            return;
          });
      }
    );
  }

  /**
   * @todo Should we dilute requested coordinates as we do for the route coords?
   * POST /api/v1/avl/batchFlow
   * @summary Given a batch of coordinates returns their flow information. Coordinates are separated with a comma.
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiGetBatchFlowInfo(req, res, next) {
    logger.info(
      `POST apiGetBatchFlowInfo is requested: ${req.path}` +
        `, body: ${JSON.stringify(req.body)}, query: ${JSON.stringify(
          req.query
        )}`
    );

    logger.info(req.body);
    logger.info(Object.keys(req.body));

    // 400 if the client does not provide a list of coordinates
    if (!req.body.hasOwnProperty("coords")) {
      res.status(400).send("-coords- query parameter is missing");
      return;
    }

    const reqCoordList = req.body.coords.split(",");
    /**  Coordinate list is named as points because we will make use of the dilueRoutePointsWorker
     *  and it expects a TomTomRoute
     */
    let validateQuery = {
      points: []
    };
    for (let i = 1; i < reqCoordList.length; i += 2) {
      let coord = {};
      coord.lat = reqCoordList[i - 1];
      coord.long = reqCoordList[i];
      validateQuery.points.push(coord);
    }

    Validator.BatchCoordValidator.validate(
      validateQuery,
      async (validError, batchCoord) => {
        if (validError) {
          logger.error(
            `Validation failed inside -apiGetBatchFlowInfo-: ${validError}` +
              `, stack: ${validError.stack}`
          );
          res.status(403).send(MALFORMED_PARAM_MSG);
          return;
        }

        // Dilute the coordinates by filtering out close points
        const pointsFlowPromList = await MapUtils.diluteRoutePointsWorker(
          batchCoord,
          TomTomAPIWrapper.getFlowInfoCoord,
          req.query.disth
        );

        /**
         * Transform Promise.all to Promise.almost to make the Promise list robust to errors
         * A few request failures out of hundredths of requests are negligible
         */
        const promiseAlmost = getPromiseAlmost(pointsFlowPromList);
        let responseData = { timestamp: Date.now(), coordsFlowInfoList: [] };
        promiseAlmost
          .then(flowInfoList => {
            flowInfoList.forEach(flowInfo => {
              if (flowInfo.failure) {
                logger.warn(
                  `-apiGetBatchFlowInfo- flowInfo is defected ${flowInfo}`
                );
                return;
              }
              // Check if flowInfo has information
              if (!flowInfo.coordinates) {
                logger.warn(
                  `-apiGetBatchFlowInfo- ${flowInfo} doesn't have any flow info.`
                );
                return;
              }
              /**
               * Construct responseData and push flowInfo.
               */
              const jamFactor = MapUtils.getTrafficJam(flowInfo);
              responseData.coordsFlowInfoList.push({
                coord: flowInfo.coordinates[0],
                freeFlowSpeed: flowInfo.freeFlowSpeed,
                currentSpeed: flowInfo.currentSpeed,
                currentTravelTime: flowInfo.currentTravelTime,
                freeFlowTravelTime: flowInfo.freeFlowTravelTime,
                confidence: flowInfo.confidence,
                frc: flowInfo.frc,
                jamFactor: jamFactor
              });
            });
            logger.info(
              `#${
                flowInfoList.length
              } of requests has been made from -apiBatchFlowInfo-`
            );
            res.json(responseData);
          })
          .catch(promiseAlmostError => {
            logger.error(
              `An error occured during multiple flow requests to TomTom from -apiBatchFlowInfo: ` +
                `${promiseAlmostError}, stack: ${promiseAlmostError.stack}`
            );
            res.status(500).send(INTERNAL_ERROR_MSG);
            return;
          });
      }
    );
  }

  /**
   * GET /api/v1/avl/weather?coord=lat,long
   * Given a `coord`, returns the weather information of that coordinate
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiGetWeatherData(req, res, next) {
    logger.info(
      `apiGetWeatherData got request: ${req.path} params: ${JSON.stringify(
        req.params
      )}, query: ${JSON.stringify(req.query)}`
    );

    // 400 if the client does not provide a coordinate
    if (!req.query.hasOwnProperty("coord")) {
      res.status(400).send("-coord- query parameter is missing.");
      return;
    }
    // Parse the input coordinate into lat, long of the reqParams.
    const coordList = req.query.coord.split(",");
    let validateQuery = {
      lat: coordList[0],
      long: coordList[1]
    };

    Validator.CoordValidator.validate(validateQuery, (validError, coord) => {
      if (validError) {
        logger.error(
          `Validation failed inside -apiGetWeatherData-: ${validError}`
        );
        res.send(MALFORMED_PARAM_MSG);
        return;
      }

      OpenWeatherAPIWrapper.getWeatherInfoCoord({
        lat: coord.lat,
        long: coord.long
      })
        .then(response => {
          res.json(response);
        })
        .catch(error => {
          logger.error(
            "Error occured during OpenWeather API call " +
              error.error +
              `, statusCode: ${error.statusCode} stack: ${error.stack}`
          );
          res.status(500).send(INTERNAL_ERROR_MSG);
        });
    });
  } // end of apiGetWeatherData

  /**
   * POST /api/v1/avl/weather/batch?coords=lat1,long1,...,latN,longN
   * Given a list of coordinates as latitude, longitude pairs. Dilutes them
   * (by taking the each point within the 1km2 area) and returns their weather info
   */
  static async apiGetBatchWeatherData(req, res, next) {
    logger.info(
      `apiGetBatchWeatherData got request: ${req.path} body: ${JSON.stringify(
        req.body
      )}, query: ${JSON.stringify(req.query)}`
    );

    // 400 if the client does not provide a coordinate
    if (!req.body.hasOwnProperty("coords")) {
      res.status(400).send("-coords- query parameter is missing.");
      return;
    }

    const reqCoordList = req.body.coords.split(",");
    let validateQuery = {
      points: []
    };
    for (let i = 1; i < reqCoordList.length; i += 2) {
      let coord = {};
      coord.lat = reqCoordList[i - 1];
      coord.long = reqCoordList[i];
      validateQuery.points.push(coord);
    }

    Validator.BatchCoordValidator.validate(
      validateQuery,
      async (validError, batchCoord) => {
        if (validError) {
          logger.error(
            `Validation failed inside -apiGetBatchWeatherData-: ${validError}` +
              `, stack: ${validError.stack}`
          );
          res.status(403).send(MALFORMED_PARAM_MSG);
          return;
        }

        // Dilute the coordinates by filtering out close points
        const pointsWeatherPromList = await MapUtils.diluteRoutePointsWorker(
          batchCoord,
          OpenWeatherAPIWrapper.getWeatherInfoCoord,
          5000
        );

        /**
         * Transform Promise.all to Promise.almost to make the Promise list robust to errors
         * A few request failures out of hundredths of requests are negligible
         */
        const weatherBatchPromAlmost = getPromiseAlmost(pointsWeatherPromList);
        let responseData = { timestamp: Date.now(), coordsWeatherData: [] };
        weatherBatchPromAlmost
          .then(weatherInfoList => {
            weatherInfoList.forEach(weatherInfo => {
              if (weatherInfo.failure) {
                logger.warn(
                  `-apiGetBatchWeatherData- flowInfo is defected ${flowInfo}`
                );
                return;
              }

              if (!weatherInfo.coord) {
                logger.warn(
                  `-apiGetBatchWeatherData- ${weatherInfo} doesn't have any weather info.`
                );
                return;
              }

              responseData.coordsWeatherData.push({
                coord: weatherInfo.coord,
                main: weatherInfo.main,
                wind: weatherInfo.wind
              });
            });
            logger.info(
              `#${
                weatherInfoList.length
              } of requests has been made from -apiBatchFlowInfo-`
            );
            res.json(responseData);
          })
          .catch(promiseAlmostError => {
            logger.error(
              `An error occured during multiple flow requests to OpenWeather from -apiGetBatchWeatherData: ` +
                `${promiseAlmostError}, stack: ${promiseAlmostError.stack}`
            );
            res.status(500).send(INTERNAL_ERROR_MSG);
            return;
          });
      }
    );
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
