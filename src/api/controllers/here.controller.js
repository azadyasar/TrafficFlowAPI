import HereAPIWrapper from "../../services/here.service";
import Joi from "joi";
import logger from "../../utils/logger";

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
        res.status(403).send(`Error occured during HERE API call: ${error}`);
      });
  }
}
