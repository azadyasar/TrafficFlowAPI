import TomTomAPIWrapper from "../../services/tomtom.service";
import Joi from "joi";
import logger from "../../utils/logger";

/**
 * A Joi Validation Schema to be used againts TomTom's Flow API Requests.
 * - `lat`: latitude is required
 * - `long`: longitute is required
 * - `zoom`: zoom is optional. must be in the range of [0, 22]
 */
const TomTomCoordReqJoiSchema = {
  lat: Joi.number().required(),
  long: Joi.number().required(),
  zoom: Joi.number().min(0).max(22),
}

export default class TomTomAPIController {
  /**
   * 
   * @param {Express.Request} req 
   * @param {Express.Response} res 
   * @param {Express.next} next 
   */
  static async apiGetTrafficFlowData(req, res, next) {
    logger.info(`apiGetTrafficFlowData got request: ${req.path} params: ${JSON.stringify(req.params)}`);
    let validateQuery = {};
    // 403 if the client does not provide a coordinate
    if (!req.query.hasOwnProperty("coord")) {
      res.status(403).send("You must provide a coordinate");
      return;
    }
    // Parse input coordinate into lat, long of the reqParams.
    const coord = req.query.coord.split(",");
    validateQuery.lat = coord[0]; validateQuery.long = coord[1]; validateQuery.zoom = req.query.zoom;
    /**
     * Validate the input data. 
     */
    Joi.validate(validateQuery, TomTomCoordReqJoiSchema, (err, value) => {
      if (err) {
        logger.error(`Validation failed inside -apiGetTrafficFlowData-: ${err}`);
        res.send("Invalid input. Details: " + err);
        return
      }
      TomTomAPIWrapper.getFlowInfoCoord({ lat: value.lat, long: value.long })
        .then( (response) => {
          res.json(response);
        })
        .catch( (error) => {
          res.status(403).send(`Error occured during TomTom API call ${error}`);
        });
    });
  }

  static async apiGetMapTileImage(req, res, next) {
    logger.info(`apiGetMapTileImage got request: ${req.path}, params: ${JSON.stringify(req.params)}, 
                query: ${JSON.stringify(req.query)}`);
    // 403 if the client does not provide a coordinate
    if (!req.query.hasOwnProperty("coord")) {
      res.status(403).send("You must provide a coordinate");
      return;
    }
    let validateQuery = {}
    // Parse input coordinate into lat, long of the reqParams.
    const coord = req.query.coord.split(",");
    validateQuery.lat = coord[0]; validateQuery.long = coord[1]; validateQuery.zoom = req.query.zoom;
    /**
     * Validate the input data. 
     */
    Joi.validate(validateQuery, TomTomCoordReqJoiSchema, (error, value) => {
      if (error) {
        logger.error(`Validation failed inside -apiGetMapTileImage-: ${err}`);
        res.send(`Invalid input. Details: ${error}`);
        return;
      }
      TomTomAPIWrapper.getTileImage({ lat: value.lat, long: value.long }, { zoom: value.zoom })
        .then( (response) => {
          res.type('png');
          response.pipe(res);
        })
        .catch( (error) => {
          res.status(403).send(`Error occured during TomTom API call: ${error}`);
        });
    });
  }
}