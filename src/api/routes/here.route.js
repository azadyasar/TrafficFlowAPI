import { Router } from "express";
import HereAPIContoller from "../controllers/here.controller";

const router = new Router();

router.get("/", (req, res) => {
  res.send("Welcome to HERE Wrapper");
});

router.route("/routeFigure").get(HereAPIContoller.apiGetRouteFigure);

export default router;
