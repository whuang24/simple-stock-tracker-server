import express, { Router } from "express";
import serverless from "serverless-http";

const app = express();
const router = Router();
const cors = require('cors')
require('dotenv').config()

import finnhubClient from './finnhub.js'
import {db, graphDataCollection} from './firebase.js'

app.use(express.urlencoded({extnded: true}));
app.use(express.json());
app.use(cors());

async function syncWithDatabase(symbol, currTime, currPercent) {
    const docRef = doc(db, "graphData", symbol)
    await setDoc(docRef, {
        graphData: {
            [new Date().toISOString()]: {
                time: currTime,
                percentage: currPercent
            }
        }
    }, {merge: true})
}

async function fetchData() {
    for (let i = 0; i < props.watchlist.length; i++) {
        const symbol = props.watchlist[i];

        const currTime = new Date();

        currTime.setTime(currTime.getTime() + currTime.getTimezoneOffset()*60*1000);

        const currTimeNum = currTime.getTime();
    
        finnhubClient.quote(symbol, (error, data, response) => {
            setWatchlistData(oldData => {
                const newData = new Map(oldData)
                newData.set(symbol, data)
                return newData
            })

            if (marketStatus) {
                syncWithDatabase(symbol, currTimeNum, data.dp);
            }
        })
    }
}

app.get("/", cors(), async (req, res) => {
    res.send("")
})

app.use("/api/", router);

export const handler = serverless(app);

