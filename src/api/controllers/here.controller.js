import HereAPIWrapper from "../../services/here.service";
import Joi from "joi";
import logger from "../../utils/logger";
import config from "config";

let hereRouteRegExp = config.get("Here.RouteDisplay.ParamsRegExp.route");
let hereMarkerRegExp = config.get("Here.RouteDisplay.ParamsRegExp.marker");
let hereLineColorRegExp = config.get(
  "Here.RouteDisplay.ParamsRegExp.lineColor"
);
let hereLineWidthRegExp = config.get(
  "Here.RouteDisplay.ParamsRegExp.lineWidth"
);
let hereMarkerFillColorRegExp = config.get(
  "Here.RouteDisplay.ParamsRegExp.markerFillColor"
);

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
      res.status(403).send("You must provide a list of coordinates as -route-");
      return;
    }

    const coordList = req.query.route;
    HereAPIWrapper.getRouteFigure(coordList)
      .then(response => {
        res.type("png");
        response.pipe(res);
      })
      .catch(error => {
        logger.error(
          `Error occured during HERE API call: ${error}` +
            `,statusCode: ${error.statusCode} stack: ${error.stack}`
        );
        res
          .status(500)
          .send(`Intermediate node error. Check your input parameters`);
      });
  }
}
