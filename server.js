import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import {finnhubClient, isMarketOpen} from './finnhub.js';
import {db, graphDataCollection} from './firebase.js';

dotenv.config();

const app = express();
const router = express.Router();

app.use(express.json());
app.use(cors());

let stockWatchlist = [];

let marketStatus = false;

app.get('/watchlist', (req, res) => {
    res.json({watchlist: stockWatchlist})
})

app.post('/updating_watchlist', (req, res) => {
    const { watchlist } = req.body;
  
    if (!watchlist) {
      return res.status(400).json({ error: 'Watchlist data is required' });
    }
  
    for (var i = 0; i < watchlist.length; i++) {
        if (stockWatchlist.includes(symbol)) {
            return res.status(400).json({ error: 'Stock symbol already exists in the watchlist' });
        }
    }
  
    stockWatchlist = watchlist;
  
    res.json({ message: 'Watchlist updated', watchlist: stockWatchlist });
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
            if (marketStatus) {
                syncWithDatabase(symbol, currTimeNum, data.dp);
            }
        })
    }
}

setInterval(async() => {
    try {
        await checkMarket();
        if (marketStatus) {
            fetchData();
        }
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
    }
    
}, 20000)


const port = process.env.PORT || 4000;
console.log(`Assigned port: ${port}`)
app.listen(port, () => {
    console.log(`Server running on ${port}`)
})

