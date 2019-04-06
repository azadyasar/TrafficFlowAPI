import TomTomAPIWrapper from "../../services/tomtom.service";
import Joi from "joi";
import logger from "../../utils/logger";

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
    .max(22)
};

export default class TomTomAPIController {
  /**
   * /api/v1/tomtom/flow?coord=48.3232,2.3242
   * Given a `coord`, responses with the flow data of that coordinate
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiGetTrafficFlowData(req, res, next) {
    logger.info(
      `apiGetTrafficFlowData got request: ${req.path} params: ${JSON.stringify(
        req.params
      )}`
    );
    // 400 if the client does not provide a coordinate
    if (!req.query.hasOwnProperty("coord")) {
      res.status(400).send("Provide a coordinate as (coord)");
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
     * Validate the input data.
     */
    Joi.validate(validateQuery, TomTomFlowJoiSchema, (err, value) => {
      if (err) {
        logger.error(
          `Validation failed inside -apiGetTrafficFlowData-: ${err}`
        );
        res.send("-coord- parameter is malformed");
        return;
      }
      TomTomAPIWrapper.getFlowInfoCoord({ lat: value.lat, long: value.long })
        .then(response => {
          res.json(response);
        })
        .catch(error => {
          res
            .status(403)
            .send(
              `Error occured during TomTom API call ${error} - ${error.stack}`
            );
        });
    });
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
      res.status(400).send("You must provide a coordinate");
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
     * Validate the input data.
     */
    Joi.validate(validateQuery, TomTomFlowJoiSchema, (error, value) => {
      if (error) {
        logger.error(`Validation failed inside -apiGetMapTileImage-: ${err}`);
        res.send("Query parameters are malformed");
        return;
      }
      TomTomAPIWrapper.getTileImage(
        { lat: value.lat, long: value.long },
        { zoom: value.zoom }
      )
        .then(response => {
          res.type("png");
          // response.pipe(require("fs").createWriteStream("./test.png"));
          response.pipe(res);
        })
        .catch(error => {
          logger.error(
            "An internal error occured while calling -getTileTimage-.Details: " +
              err +
              `Stack: ${err.stack}`
          );
          res.status(500).send(`An internal server error occured.`);
        });
    });
  }
}
