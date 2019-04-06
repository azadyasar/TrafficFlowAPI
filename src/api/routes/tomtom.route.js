import { Router } from "express";
import TomTomAPIController from "../controllers/tomtom.controller";

const router = new Router();

router.get("/", (req, res) => {
  res.send("Welcome to TomTom Wrapper");
});
router.route("/flow").get(TomTomAPIController.apiGetTrafficFlowData);
router.route("/tile").get(TomTomAPIController.apiGetMapTileImage);

export default router;
