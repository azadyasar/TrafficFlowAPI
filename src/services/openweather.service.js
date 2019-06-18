import axios from "axios";
import config from "config";
import MapUtils from "../utils/map.utils";
import logger from "../utils/logger";

/* axios.interceptors.request.use(request => {
  console.log("Starting Request", request);
  return request;
}); */

const openWeatherBaseURL = config.get("OpenWeather.baseURL");
let openWeatherAPIKey;
if (config.has("OPEN_WEATHER_API_KEY"))
  openWeatherAPIKey = config.get("OPEN_WEATHER_API_KEY");
else if (process.env.OPEN_WEATHER_API_KEY)
  openWeatherAPIKey = process.env.OPEN_WEATHER_API_KEY;
else logger.warn(config.get("Mlg.Warnings.MissingOpenWeatherAPIKey"));

export default class OpenWeatherAPIWrapper {
  /**
   * @summary Given a `coord`, calls OpenWeather API for the weather data of the given
   * coordinate, then returns a `OpenWeatherData` object.
   * @param {Coordinate} coord - Must be a `Coordinate` containing `lat` and `long`.
   * @returns {Promise<OpenWeatherData} Returns a promise of the openweather data
   */
  static async getWeatherInfoCoord(coord) {
    logger.info(
      "Executing GET Request from getWeatherInfoCoord" +
        openWeatherBaseURL +
        " - " +
        JSON.stringify(coord)
    );

    return new Promise((resolve, reject) => {
      axios
        .get(openWeatherBaseURL, {
          params: {
            lat: coord.lat,
            lon: coord.long,
            appid: openWeatherAPIKey,
            units: "metric"
          }
        })
        .then(response => {
          /**
           * Reject if the response from OpenWeather is not OK
           */
          if (response.status !== 200) {
            logger.warn(
              "[getWeatherInfoCoord] response status is: " + response.status
            );
            reject({
              error: new Error(
                "Response from OpenWeather API has a non-200 status = " +
                  response.status
              ),
              statusCode: response.status
            });
          }

          let weatherData = OpenWeatherUtils.storeWeatherData(response.data);
          resolve(weatherData);
        })
        .catch(error => {
          logger.error(
            `Error occured during GET request of getWeatherInfoCoord. Request to coord: ${JSON.stringify(
              coord
            )}` +
              `Details: ${error}` +
              `Stack: ${error.stack}`
          );
          if (error.response && error.response.status)
            reject({
              error: new Error(
                "Response from OpenWeather API has a non-200 status code"
              ),
              statusCode: error.response.status
            });
          else
            reject({
              error: new Error(
                "Unknown error occured during OpenWeather API call"
              )
            });
        });
    });
  }
}

class OpenWeatherUtils {
  /**
   * Parses the incoming weather data from OpenWeather into a more convenient format
   * @param {axios.response.data} data - Data containing the weather info
   * @returns {OpenWeatherData}
   */
  static storeWeatherData(data) {
    const destObject = {};
    if (data === null || data === undefined) return destObject;
    if (data.coord) {
      destObject.coord = {
        lat: data.coord.lat,
        long: data.coord.lon
      };
    }
    destObject.main = {};
    if (data.main) {
      destObject.main.temp = data.main.temp;
      destObject.main.hum = data.main.humidity;
      destObject.main.pres = data.main.pressure;
    }
    if (data.wind) destObject.wind = data.wind;
    return destObject;
  }
}

/**
 * Represents a GPS coordinate
 * @typedef Coordinate
 * @property {number} lat  - The latitude of the given coordinate
 * @property {number} long - The longitude of the given coordinate
 */

/**
 * A Weather Data Object
 * @typedef OpenWeatherData
 * @property {number} temp - Temperature in Celcius
 * @property {number} hum - Humidity %
 */
