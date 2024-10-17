import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

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
    res.json({watchlist: stockWatchlist});
    console.log(`Watchlist obtained`);
})

app.post('/updating_watchlist', (req, res) => {
    const { watchlist } = req.body;
  
    if (!watchlist) {
      return res.status(400).json({ error: 'Watchlist data is required' });
    }
  
    stockWatchlist = watchlist;
  
    res.json({ message: 'Watchlist updated', watchlist: stockWatchlist });
    console.log(`Watchlist updated: ${stockWatchlist}`);
});

app.get('/ping', (req, res) => {
    res.send('Server is still running.')
})


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
    console.log(stockWatchlist);
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

function startInterval() {
    setInterval(async() => {
        try {
            await checkMarket();
            fetchData();
        } catch (error) {
            console.error("Error occurred while fetching data:", error);
        }
        
    }, 20000)
}

app.get('/', (req, res) => {
    res.send("Simple Stock Tracker Server Home");
    startInterval();
})


const port = process.env.PORT || 4000;
console.log(`Assigned port: ${port}`)
app.listen(port, () => {
    console.log(`Server running on ${port}`)
})

