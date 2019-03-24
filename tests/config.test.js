const config = require('config');
const chalk  = require('chalk');


describe("Config Package", () => {

    test("Application Name is set properly", async () => {
        const appName = config.get("name");
        expect(appName).not.toBeNull();
    });

    test("Logger configs in default.json are set", async () => {
        let logLevel;
        try {
            logLevel = config.get("Logger.logLevel");
            expect(logLevel).not.toBeNull();
            expect(logLevel).toBeDefined();
        } catch (error) {
            expect(error).toBeUndefined();
        }

        let infoLogPath;
        try {
            infoLogPath = config.get("Logger.infoLogPath");
            expect(infoLogPath).not.toBeNull();
            expect(infoLogPath).toBeDefined();
        } catch (error) {
            expect(error).toBeUndefined();
        }


    });

    test("JWT_SECRET_KEY is set", async () => {
        try {
            const jwt_secret_key = config.get("jwt_secret_key");
            expect(jwt_secret_key).not.toBeNull();
            
        } catch (error) {
            expect(error).toBeNull();
        }

    });
});
/* 
const testBasicConfig = () => {
    // default.json
    let logLevel;
    try {
        logLevel = config.get("Logger.logLevel");
    } catch (error) {
        console.error('Cannot find logLevel inside default.json');
    }
    console.log(chalk.yellow(`[CONFIG-TEST]: `) + "default.json => " +
        `logLevel: ${logLevel}`);
    
    // development.json or production.json
    // to choose one before start, set NODE_ENV to either development or production
    let appName;
    try {
        appName = config.get("name");
    } catch (error) {
        console.log(error);
    }
    console.log(chalk.yellow(`[CONFIG-TEST]: `) + "Testing development and production configs "
                + "export NODE_ENV environment variable to test it appName: " + appName);

    // custom-environment-variables.json
    let hostMail, password;
    try {
        hostMail = config.get("testMail.hostmail");
        password = config.get("testMail.password");
    } catch (error) {
        console.error(chalk.red("=> ") + "An error occured during retrieving custom-environment-variables.json config");
        console.error(chalk.red("=> ") + "Make sure that you have exported appDevHost and NODE_APP_PW env variables");
        console.error(error);
    }
    console.log(chalk.yellow(`[CONFIG-TEST]: `) + `hostmail: ${hostMail}, password: ${password}`);
};

module.exports = {
    testBasicConfig: testBasicConfig
};


 */