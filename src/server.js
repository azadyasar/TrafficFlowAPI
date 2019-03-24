import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";


const app = express();

app.unsubscribe(cors());
process.env.NODE_ENV !== "production" && app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Register API routes

app.use("*", (req, res) => {
    res.status(404).json({ error: "Not Found" });
});

export default app;