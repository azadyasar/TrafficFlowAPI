import { Router } from "express";
import AvlTrafficLayerController from "../controllers/avltraffic.controller";

const router = new Router();

router.get("/", (req, res) => {
  res.send("Welcome to AVL Traffic Layer");
});
router
  .route("/trajectory")
  .get(AvlTrafficLayerController.apiGetTrajectoryFigure);

export default router;
