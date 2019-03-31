import TomTomAPIWrapper from "../src/services/tomtom.service";
import logger from "../src/utils/logger";

/**
 * Will be used during the test of following functions:
 * - `getFlowInfoCoord`
 * - `getTileImage`
 */
const point = {
    lat: 41.040555,
    long: 29.121362,
};

/**
 * Will be used during the test of following functions:
 * - `getTileImage`
 */
const zoom = 12;

/**
 * TomTom API calls might need more time than the default 5 secs.
 */
jest.setTimeout(60000); 

describe('TomTomAPI', () => {

  test('Able to GET traffic flow of a given coordinate', async () => {
    return TomTomAPIWrapper.getFlowInfoCoord(point)
      .then(trafficFlowResult => {
          expect(trafficFlowResult).not.toBeNull();
          expect(trafficFlowResult).toBeDefined();
          expect(typeof trafficFlowResult).toBe('object');
      })
      .catch(error => {
          logger.error(error);
          expect(error).toBeUndefined();
      });
  });

  test('Able to GET a tile image of a given coordinate', async function () {
    console.log(zoom);
    return TomTomAPIWrapper.getTileImage(point)
      .then( (responseData) => {
        expect(responseData).not.toBeNull();
        expect(responseData).toBeDefined();
        expect(typeof responseData).toBe('object');
      })
      .catch( (error) => {
        logger.error(error);
        console.log(JSON.stringify(error));
        expect(error).toBeUndefined();
      });
  });

});