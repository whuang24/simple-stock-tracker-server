import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

import { onSnapshot } from 'firebase/firestore';
import {finnhubClient, isMarketOpen} from './finnhub.js';
import {db, graphDataCollection, watchlistCollection} from './firebase.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

let marketStatus = false;

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
});

app.get('/get_watchlist', async (req, res) => {
    try {
        const watchlist = getWatchlist();
        res.json(watchlist);
        console.log(watchlist);
    } catch (error) {
        console.error("Error fetching watchlist:", error);
        res.status(500).json({ error: 'Failed to fetch watchlist' });
    }
});

async function getWatchlist() { 
    var stockWatchlist = [];
    const unsubscribeListener = onSnapshot(watchlistCollection, function(snapshot) {
        const dataArray = snapshot.docs
            .filter(doc => (doc.id === "watchlist"))
            .map(doc => ({...doc.data().watchlist}))

        console.log(`Data Array: ${dataArray}`)
    });

    
    
    return stockWatchlist
}

async function setWatchlist(currWatchlist) {
    try {
        const docRef = doc(db, "watchlist", "watchlist");
        await setDoc(docRef, { watchlist: currWatchlist }, { merge: true});
        console.log("Watchlist saved to Firestore.");
    } catch (error) {
        console.error("Error saving watchlist:", error);
    }
}


async function checkMarket() {
    try {
        const currStatus = await isMarketOpen();
        marketStatus = currStatus;
        console.log(`Market status: ${marketStatus ? "Open" : "Closed"}`);
    } catch (error) {
        console.error("Error checking market status:", error);
    }

}

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
    for (const symbol of stockWatchlist) {
        try {
            const currTime = new Date();
            currTime.setTime(currTime.getTime() + currTime.getTimezoneOffset()*60*1000);
            const currTimeNum = currTime.getTime();

            finnhubClient.quote(symbol, (error, data, response) => {
                if (error) {
                    console.error(`Error fetching data for ${symbol}:`, error);
                    return;
                }

                if (marketStatus && data.dp !== undefined) {
                    syncWithDatabase(symbol, currTimeNum, data.dp);
                }
            });
        } catch (error) {
            console.error(`Error in fetchData for ${symbol}:`, error);
        }
    }
}

function startInterval() {
    setInterval(async() => {
        try {
            await checkMarket();
            await fetchData();
        } catch (error) {
            console.error("Error occurred while fetching data:", error);
        }
    }, 20000)
}

// startInterval();

app.get('/', (req, res) => {
    res.send("Simple Stock Tracker Server Home");
})


const port = process.env.PORT || 4000;

app.listen(port, () => {
    console.log(`Server running on ${port}`)
})

