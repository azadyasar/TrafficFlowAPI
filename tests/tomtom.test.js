// import { TomTomFlowSegmentData } from "../src/services/tomtom.service";
import TomTomTrafficFlow from "../src/services/tomtom.service";


const point = {
    lat: 41.040555,
    long: 29.121362,
}

describe('TomTomAPI', () => {
    
    test('Able to GET traffic flow of a given coord', async () => {
        return TomTomTrafficFlow.getFlowInfoCoord(point)
            .then(trafficFlowResult => {
                expect(trafficFlowResult).not.toBeNull();
                expect(trafficFlowResult).toBeDefined();
                expect(typeof trafficFlowResult).toBe('object');
            })
            .catch(error => {
                expect(error).toBeUndefined();
            });
    });
});