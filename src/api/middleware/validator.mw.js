import Joi from "joi";

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
  TomTomFlowValidatior: Joi.object({
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
  })
};
