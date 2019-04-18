import HereAPIWrapper from "../../services/here.service";
import logger from "../../utils/logger";
import config from "config";
import tomtom from "./tomtom.controller";

const INTERNAL_ERROR_MSG = config.get("Mlg.Warnings.InternalError");
const MALFORMED_PARAM_MSG = config.get("Mlg.Warnings.MalformedParameters");

export default class HereAPIContoller {
  /**
   *
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.next} next
   */
  static async apiGetRouteFigure(req, res, next) {
    logger.info(
      `Received GET Request ${req.path} params: ${JSON.stringify(req.query)}`
    );
    /**
     * TODO
     * Parse incoming route data
     * Validation, incoming data conversion
     */
    if (!req.query.hasOwnProperty("route")) {
      res.status(400).send("You must provide a list of coordinates as -route-");
      return;
    }

    const coordList = req.query.route;
    HereAPIWrapper.getSingleRouteFigure({ coords: coordList })
      .then(response => {
        res.type("png");
        response.pipe(res);
      })
      .catch(error => {
        logger.error(
          `Error occured during HERE API call: ${error}` +
            `,statusCode: ${error.statusCode} stack: ${error.stack}`
        );
        res.status(500).send(INTERNAL_ERROR_MSG);
      });
  }
}
