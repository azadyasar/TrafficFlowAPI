const config = require('config');
require('dotenv').config();

console.log(`Secret key from dotenv: ${process.env.JWT_SECRET_KEY}`);
console.log(config.get('jwt_secret_key'));

console.log(process.env.NODE_ENV);

const port = process.env.PORT || 5432;


import app from "./server";
app.listen(port, () => {
    console.log(`Running ${config.get('name')} on port ${port}`);
});
