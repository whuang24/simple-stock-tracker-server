import express, { Router } from "express";
import serverless from "serverless-http";

const app = express();
const router = Router();
const cors = require('cors')
require('dotenv').config()

import {finnhubClient, isMarketOpen} from './finnhub.js'
import {db, graphDataCollection} from './firebase.js'

app.use(express.json());
app.use(cors());

let stockWatchlist = [];

let marketStatus = false;

app.get('/watchlist', (req, res) => {
    res.json({watchlist: stockWatchlist})
})

app.post('/add-stock', (req, res) => {
    const { symbol } = req.body;
  
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }
  
    if (stockWatchlist.includes(symbol)) {
      return res.status(400).json({ error: 'Stock symbol already exists in the watchlist' });
    }
  
    // Add the new stock symbol to the list
    stockWatchlist.push(symbol);
  
    // Respond with the updated watchlist
    res.json({ message: 'Stock symbol added', watchlist: stockWatchlist });
  });


async function checkMarket() {
    const currStatus = await isMarketOpen();
    marketStatus = currStatus;
}

async function syncWithDatabase(symbol, currTime, currPercent) {
    const docRef = doc(db, process.env.COLLECTION_NAME, symbol)
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
    for (let i = 0; i < stockWatchlist.length; i++) {
        const symbol = stockWatchlist[i];

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

setInterval(async() => {
    await checkMarket();
    if (marketStatus) {
        fetchData();
    }
}, 20000)


const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server running on ${port}`)
})

