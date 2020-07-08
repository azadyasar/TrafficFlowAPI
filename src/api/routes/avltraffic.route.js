import { Router } from "express";
import AvlTrafficLayerController from "../controllers/avltraffic.controller";

const router = new Router();

router.get("/", (req, res) => {
  res.send("Welcome to AVL Traffic Layer");
});
router
  .route("/trajectory")
  .get(AvlTrafficLayerController.apiGetTrajectoryFigure);
router.route("/route/figure").get(AvlTrafficLayerController.apiGetRouteFigure);
router
  .route("/route/flow")
  .get(
    AvlTrafficLayerController.apiCalculateRouteTrafficFlow,
    AvlTrafficLayerController.apiGetRouteTrafficFlow
  );
router
  .route("/route/flow/figure")
  .get(
    AvlTrafficLayerController.apiCalculateRouteTrafficFlow,
    AvlTrafficLayerController.apiGetRouteTrafficFigure
  );
router.route("/route").get(AvlTrafficLayerController.apiGetRoute);
router.route("/batchFlow").get(AvlTrafficLayerController.apiGetBatchFlowInfo);
router.route("/batchFlow").post(AvlTrafficLayerController.apiGetBatchFlowInfo);
router.route("/weather").get(AvlTrafficLayerController.apiGetWeatherData);
router
  .route("/weather/batch")
  .post(AvlTrafficLayerController.apiGetBatchWeatherData);

export default router;
