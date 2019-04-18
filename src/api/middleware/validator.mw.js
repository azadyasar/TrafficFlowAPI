import Joi from "joi";
import config from "config";

const DEFAULT_TRAJECTORY_REPEAT = config.get(
  "Avl.DefaultParams.trajectoryRepeat"
);
const DEFAULT_TOMTOM_ZOOM_LEVEL = config.get("TomTom.Map.DefaultParams.zoom");
const DEFAULT_HERE_FIGURE_HEIGHT = config.get(
  "Here.RouteDisplay.DefaultParams.height"
);
const DEFAULT_HERE_FIGURE_WIDTH = config.get(
  "Here.RouteDisplay.DefaultParams.width"
);
const DEFAULT_HERE_FIGURE_LINECOLOR = config.get(
  "Here.RouteDisplay.DefaultParams.lineColor"
);
const DEFAULT_HERE_FIGURE_LINEWIDTH = config.get(
  "Here.RouteDisplay.DefaultParams.lineWidth"
);

const JoiCoordinateSchema = Joi.object({
  lat: Joi.number()
    .min(-90)
    .max(90)
    .required(),
  long: Joi.number()
    .min(-180)
    .max(180)
    .required()
});

module.exports = {
  /**
   * A source and destination coordinate pair validator.
   * Should have both source and destination coordinates.
   */
  SourceDestParamValidator: Joi.object({
    source: JoiCoordinateSchema,
    destination: JoiCoordinateSchema
  }),
  /**
   * A Joi Validation Schema to be used againts TomTom's Flow API Requests.
   * - `lat`: latitude is required
   * - `long`: longitute is required
   * - `zoom`: zoom is optional. must be in the range of [0, 22]
   */
  TomTomFlowValidator: Joi.object({
    lat: Joi.number()
      .min(-90)
      .max(90)
      .required(),
    long: Joi.number()
      .min(-180)
      .max(180)
      .required(),
    zoom: Joi.number()
      .min(0)
      .max(22)
      .default(DEFAULT_TOMTOM_ZOOM_LEVEL)
  }),

  HereRouteFigParamValidator: Joi.object({
    lineColor: Joi.string().regex(/[A-Fa-f0-9]{6}/)
  }),

  AvlRouteFigureParamValidator: Joi.object({
    source: JoiCoordinateSchema.required(),
    destination: JoiCoordinateSchema.required(),
    height: Joi.number()
      .min(32)
      .max(2048)
      .default(DEFAULT_HERE_FIGURE_HEIGHT),
    width: Joi.number()
      .min(32)
      .max(2048)
      .default(DEFAULT_HERE_FIGURE_WIDTH),
    disth: Joi.number(),
    lineColor: Joi.string()
      .regex(/[A-Fa-f0-9]{6}/)
      .default(DEFAULT_HERE_FIGURE_LINECOLOR),
    lineWidth: Joi.number()
      .min(1)
      .max(20)
      .default(DEFAULT_HERE_FIGURE_LINEWIDTH)
  }),

  AvlTrajectoryParamValidator: Joi.object({
    lat: Joi.number()
      .min(-90)
      .max(90)
      .required(),
    long: Joi.number()
      .min(-180)
      .max(180)
      .required(),
    zoom: Joi.number()
      .min(0)
      .max(22),
    repeat: Joi.number()
      .min(1)
      .max(7)
      .default(DEFAULT_TRAJECTORY_REPEAT),
    height: Joi.number()
      .min(32)
      .max(2048),
    width: Joi.number()
      .min(32)
      .max(2048)
  })
};
