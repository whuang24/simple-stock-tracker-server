import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

import { onSnapshot, doc, setDoc, getDoc} from 'firebase/firestore';
import {finnhubClient, isMarketOpen} from './finnhub.js';
import {db, graphDataCollection, watchlistCollection} from './firebase.js';

dotenv.config({path: "API-Keys.env"});

const app = express();

app.use(express.json());
app.use(cors());

let marketStatus = false;

app.post('/updating_watchlist', async (req, res) => {
    const { watchlist } = req.body;
  
    if (!watchlist) {
      return res.status(400).json({ error: 'Watchlist data is required' });
    }

    try {
        await setWatchlist(watchlist);
        res.json({message: 'Watchlist updated', watchlist});
        console.log(`Watchlist updated:`, watchlist);
    } catch (error) {
        console.error("Error updating watchlist:", error);
        res.status(500).json({ error: 'Failed to update watchlist' });
    }
});

async function setWatchlist(currWatchlist) {
    try {
        const docRef = doc(db, "watchlist", "watchlist");
        await setDoc(docRef, currWatchlist, { merge: false});
        console.log("Watchlist saved to Firestore.");
    } catch (error) {
        console.error("Error saving watchlist:", error);
    }
}

app.get('/get_watchlist', async (req, res) => {
    try {
        var watchlist = await getWatchlist();
        if (!Array.isArray(watchlist)) {
            console.error("Watchlist type incorrect");
        }
        res.json(watchlist);
        console.log("Watchlist fetched:", watchlist);
    } catch (error) {
        console.error("Error fetching watchlist:", error);
        res.status(500).json({ error: 'Failed to fetch watchlist' });
    }
});

async function getWatchlist() {
    const docRef = doc(watchlistCollection, "watchlist");

    return new Promise((resolve, reject) => {
        const unsubscribeListener = onSnapshot(docRef, function(snapshot) {
            if (snapshot.exists()) {
                const stockWatchlist = Object.keys(snapshot.data());
                resolve(stockWatchlist);
            } else {
                console.warn("Watchlist document does not exist")
                resolve([]);
            }
            unsubscribeListener();
        }, (error) => {
            reject(error);
        });
    });
}


app.get('/ping', (req, res) => {
    res.send('Server is still running.')
});


async function checkMarket() {
    try {
        const currStatus = await isMarketOpen();
        marketStatus = currStatus;
        console.log(`Market status: ${marketStatus}`);
        return marketStatus
    } catch (error) {
        console.error("Error checking market status:", error);
        return false
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

async function fetchData(currWatchlist) {
    for (const symbol of currWatchlist) {
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
    console.log("Interval started");
    let intervalId;
    const runIntervalTask = async() => {
        try {
            const currWatchlist = await getWatchlist();

            if (!currWatchlist || currWatchlist.length === 0) {
                console.warn("Watchlist is empty. Skipping fetch operation.");
                return;
            }

            const marketStatus = await checkMarket();
            if (!marketStatus) {
                console.log("Market is closed. Skipping data fetch.");
                return;                
            }

            await fetchData(currWatchlist);
            console.log("Interval task completed.");
        } catch (error) {
            console.error("Error occurred while fetching data:", error);
        }
    };

    runIntervalTask();

    intervalId = setInterval(runIntervalTask, 20000);

    return intervalId;
}


async function deleteOldEntries() {
    try {
        const currWatchlist = await getWatchlist();

        if (!currWatchlist || currWatchlist.length === 0) {
            console.warn("Watchlist is empty. Skipping fetch operation.");
            return;
        }

        for (const symbol of currWatchlist) {
            try {
                const docRef = doc(db, "graphData", symbol);
                const docSnap = await getDoc(docRef);


                if (!docSnap.exists()) {
                    console.warn(`No document found for symbol: ${symbol}`);
                    return;
                }

                const data = docSnap.data().graphData;
                const now = new Date();
                const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

                const updatedData = {};
                for (const [timestamp, entry] of Object.entries(data)) {
                    const entryDate = new Date(timestamp);
                    if (entryDate >= fiveDaysAgo) {
                        updatedData[timestamp] = entry;
                    }
                }

                await setDoc(docRef, { graphData: updatedData }, { merge: true });
                console.log(`Old entries deleted for symbol: ${symbol}`);
            } catch (error) {
                console.error(`Error deleting old entries for symbol ${symbol}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error occurred while fetching data:`, error);
    }
}

startInterval();

app.get('/', (req, res) => {
    res.send("Simple Stock Tracker Server Home");
})

const port = process.env.PORT || 4000;

console.log(process.env.PORT)

app.listen(port, () => {
    console.log(`Server running on ${port}`)
})

