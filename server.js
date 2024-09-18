const express = require("express")
const app = express();
const port = 3000;
const cors = require('cors')
require('dotenv').config()

import finnhubClient from './finnhub.js'

app.use(express.urlencoded({extnded: true}));
app.use(express.json());
app.use(cors());

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`)
})

