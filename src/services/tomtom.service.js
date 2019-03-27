const axios  = require('axios');
const config = require('config');

import logger from "../utils/logger";
// const logger = require("../utils/logger");

let tomtomTrafficAPIVersionNumber = config.get("TomTom.Traffic.versionNumber");
let tomtomTrafficZoomLevel        = config.get("TomTom.Traffic.DefaultParams.zoom");
let tomtomTrafficReturnFromat     = config.get("TomTom.Traffic.DefaultParams.format");
let tomtomTrafficStyle            = config.get("TomTom.Traffic.DefaultParams.style");
let tomtomAppKey;

if (config.has("TOMTOM_API_KEY"))
    tomtomAppKey  = config.get("TOMTOM_API_KEY").toString();
else if (process.env.TOMTOM_API_KEY)
    tomtomAppKey = process.env.TOMTOM_API_KEY;
else 
    logger.warn("TOMTOM_API_KEY environment variable is not set. Requests to TomTom API will fail.");


let tomtomBaseURL = config.get("TomTom.Traffic.APIEndpointTemplate")
                                .replace("versionNumber", tomtomTrafficAPIVersionNumber)
                                .replace("style", tomtomTrafficStyle)
                                .replace("zoom", tomtomTrafficZoomLevel)
                                .replace("format", tomtomTrafficReturnFromat);

logger.info("tomtomBaseURL is set up: " + tomtomBaseURL);

export default class TomTomTrafficFlow {
    /**
     * 
     * @param {Coordinate} coord - Must be a pair of numbers.
     * @returns {Promise<TomTomFlowSegmentData>} Returns a promise of the flow segment data
     */
    static async getFlowInfoCoord(coord) {
        let tomtomFlowSegmentData = {};
        logger.info("Executing GET Request " + tomtomBaseURL + " - " + JSON.stringify(coord));
        return new Promise( (resolve, reject) => {
            axios.get(tomtomBaseURL, {
                params: {
                    key: tomtomAppKey,
                    point: `${coord.lat},${coord.long}`,
                }
            })
            .then( (response) => {
                logger.info("GOT Response: " + response);
                if (response.status !== 200) {
                    logger.warn("Response status is " + response.status);
                    reject(new Error("Response status is " + response.status));
                }
                tomtomFlowSegmentData = TomTomUtils.storeFlowSegmentData(response.data);
                logger.info(`Response data: ${tomtomFlowSegmentData}`);
                resolve(tomtomFlowSegmentData);
            })
            .catch( (error) => {
                logger.error(`Error occured during GET request: ${error}`);
                reject(error);
            });
        });
    }
} 
/* 
async function test() {
    try {
        const result = await TomTomTrafficFlow.getFlowInfoCoord(point);
        logger.info(`Result: ${result}`);
    } catch (error) {
        console.error(error);
    }

} */



class TomTomUtils {
    static storeFlowSegmentData(data) {
        const destObject = {};
        if (data === null || data === undefined)
            return destObject;
        data = data.flowSegmentData;
        destObject.frc                = data.frc;
        destObject.roadDescription    = config.get(`TomTom.${data.frc}`);
        destObject.currentSpeed       = data.currentSpeed;
        destObject.freeFlowSpeed      = data.freeFlowSpeed;
        destObject.currentTravelTime  = data.currentTravelTime;
        destObject.freeFlowTravelTime = data.freeFlowTravelTime;
        destObject.confidence         = data.confidence;
        destObject.coordinates        = Array(data.coordinates.coordinate)[0];
        return destObject;
    }
}

// module.exports = TomTomTrafficFlow;


/**
 * 
 */

/**
 * Represents a GPS coordinate
 * @typedef Coordinate 
 * @property {number} lat  - The latitude of the given coordinate
 * @property {number} long - The longitude of the given coordinate
 */

/**
 * Represents the Flow Information object of a given coordinate
 * @typedef TomTomFlowSegmentData
 * @property {string} frc - functional road class
 * @property {string} roadDescription - The description of the road, depends on the `frc`
 * @property {number} currentSpeed - Current speed of the road
 * @property {number} freeFlowSpeed - Free flow speed of the road
 * @property {number} currentTravelTime - Current travel time of the road
 * @property {number} freeFlowTravelTime - Free flow travel time of the road
* @property {number} confidence - Confidence of the speed and time information
* @property {object[]} coordinates - Coordinate array, a line through the direction of the road, starting from the given coordinate 
*/


 /* 
 axios.get(tomtomBaseURL, {
     params: {
         key: tomtomAppKey,
         point,
     }
 })
   .then( (response) => {
     for (key in response) {
       const result = response[key];
       console.log(`${key}: ${result}`);
     }
     
     if (response.status !== 200) {
         console.error("Response status is not OK - 200");
         process.exit(1);
     }
     console.log(response.data);
 
     const tomtomFlowSegmentData = storeFlowSegmentData(response.data);
     console.log(tomtomFlowSegmentData);
     
     console.log(response.data.flowSegmentData.coordinates);
     const coordArray = Array(response.data.flowSegmentData.coordinates.coordinate)[0];
     console.log(`Retrieved coordinate array info:\n\tLength: ${coordArray.length}`);
     console.log(`\ttype: ${typeof coordArray}`);
     console.log("\tisArray: " + Array.isArray(coordArray));
     console.log("\tElements:");
     coordArray.forEach((element, idx) => {
       console.log(`\t\tIndex #${idx}: ${JSON.stringify(element)}`);
     });
   })
   .catch( (error) => {
     console.error(error);
   }); */