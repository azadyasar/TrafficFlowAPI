import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import tomtomRouter from "./api/routes/tomtom";
import logger from "./utils/logger";


const app = express();

app.use(cors());
process.env.NODE_ENV !== "production" && app.use(morgan("combined", { stream: logger.stream }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Register API routes
app.use("/api/v1/tomtom", tomtomRouter);

app.use("*", (req, res) => {
    res.status(404).json({ error: "Not Found" });
});

export default app;