import TomTomAPIWrapper from "../../services/tomtom.service";
import logger from "../../utils/logger";
import Validators from "../middleware/validator.mw";
import config from "config";
import MapUtils from "../../utils/map.utils";

const INTERNAL_ERROR_MSG = config.get("Mlg.Warnings.InternalError");
const MALFORMED_PARAM_MSG = config.get("Mlg.Warnings.MalformedParameters");

export default class TomTomAPIController {
  /**
   * /api/v1/tomtom/flow?coord=48.3232,2.3242
   * Given a `coord`, returns the flow data of that coordinate
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiGetTrafficFlowData(req, res, next) {
    logger.info(
      `apiGetTrafficFlowData got request: ${req.path} params: ${JSON.stringify(
        req.params
      )}, query: ${JSON.stringify(req.query)}`
    );
    // 400 if the client does not provide a coordinate
    if (!req.query.hasOwnProperty("coord")) {
      res.status(400).send("-coord- query parameter is missing.");
      return;
    }
    // Parse input coordinate into lat, long of the reqParams.
    const coordList = req.query.coord.split(",");
    let validateQuery = {
      lat: coordList[0],
      long: coordList[1]
    };
    /**
     * Validate incoming request parameters.
     */
    Validators.TomTomFlowValidator.validate(
      validateQuery,
      (validError, value) => {
        if (validError) {
          logger.error(
            `Validation failed inside -apiGetTrafficFlowData-: ${validError}`
          );
          res.send(MALFORMED_PARAM_MSG);
          return;
        }
        /**
         * Make a request to the TomTom API
         * Then redirect response to the client.
         */
        TomTomAPIWrapper.getFlowInfoCoord({ lat: value.lat, long: value.long })
          .then(response => {
            const jam = MapUtils.getTrafficJam(response);
            response.jamFactor = jam;
            res.json(response);

          })
          .catch(error => {
            logger.error(
              "Error occured during TomTom API call " +
                error.error +
                `, statusCode: ${error.statusCode} stack: ${error.stack}`
            );
            res.status(500).send(INTERNAL_ERROR_MSG);
          });
      }
    );
  }

  /**
   * Given a coordinate and a zoom, converts the coordinate to its corresponding x and y tile coordinates.
   * If zoom is missing within the query params, 12 is used by default. Returns an image of the resulting tile.
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiGetMapTileImage(req, res, next) {
    logger.info(`apiGetMapTileImage got request: ${
      req.path
    }, params: ${JSON.stringify(req.params)}, 
                query: ${JSON.stringify(req.query)}`);
    // 400 if the client does not provide a coordinate
    if (!req.query.hasOwnProperty("coord")) {
      res.status(400).send("-coord- param is missing.");
      return;
    }
    // Parse input coordinate into lat, long of the reqParams.
    const coordList = req.query.coord.split(",");
    let validateQuery = {
      lat: coordList[0],
      long: coordList[1],
      zoom: req.query.zoom
    };
    /**
     * Validate incoming request parameters.
     */
    Validators.TomTomFlowValidator.validate(
      validateQuery,
      (validError, value) => {
        if (validError) {
          logger.error(
            `Validation failed inside -apiGetMapTileImage-: ${validError}`
          );
          res.send(MALFORMED_PARAM_MSG);
          return;
        }
        /**
         * Make a request to the TomTom API
         * Then pipe the incoming image stream to the client
         */
        TomTomAPIWrapper.getTileImage(
          { lat: value.lat, long: value.long },
          { zoom: value.zoom }
        )
          .then(response => {
            res.type("png");
            response.pipe(res);
          })
          .catch(error => {
            logger.error(
              "Error occured during TomTom API call " +
                error.error +
                `, statusCode: ${error.statusCode} stack: ${error.stack}`
            );
            res.status(500).send(INTERNAL_ERROR_MSG);
          });
      }
    );
  }

  /**
   * Given a source and destination coordinate, returns an optimal path between them.
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiGetRoute(req, res, next) {
    logger.info(
      `apiGetRoute got request: ${req.path}, params: ${JSON.stringify(
        req.params
      )}, query: ${req.query} `
    );
    // 400 if the client does not provide the source and destination coordinates
    if (
      !req.query.hasOwnProperty("source") ||
      !req.query.hasOwnProperty("dest")
    ) {
      res.status(403).send("-source- and -dest- query parameters are missing");
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

    Validators.SourceDestParamValidator.validate(
      validateQuery,
      (validError, value) => {
        if (validError) {
          logger.error(
            `Validation failed inside -apiGetRoute-: ${validError}` +
              `, stack: ${validError.stack}`
          );
          res.status(403).send(MALFORMED_PARAM_MSG);
          return;
        }
        TomTomAPIWrapper.getRoute(value.source, value.destination)
          .then(result => {
            logger.info(`Got result from the TomTomAPIWrapper: ${result}`);
            res.send(result);
          })
          .catch(reqError => {
            logger.error(
              `getRoute got error ${reqError}, stack: ${reqError.stack}`
            );
            res.status(500).send(INTERNAL_ERROR_MSG);
          });
      }
    );
  }
}

/**
 * @typedef TomTomRoute
 * @property {string} summary
 * @property {Coordinate[0]} points
 */
