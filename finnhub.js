require('dotenv').config()

const finnhub = require('finnhub');

const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY;
export default finnhubClient = new finnhub.DefaultApi()

export async function isMarketOpen() {
    const response = await fetch(`https://finnhub.io/api/v1/stock/market-status?exchange=US&token=${API_KEY}`);
    const data = await response.json();
    return data.isOpen;
}