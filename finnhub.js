import dotenv from 'dotenv';
import fetch from 'node-fetch';
import finnhub from 'finnhub';
dotenv.config();

const API_KEY = process.env.FINNHUB_API_KEY;


const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = API_KEY
export const finnhubClient = new finnhub.DefaultApi()

export async function isMarketOpen() {
    const response = await fetch(`https://finnhub.io/api/v1/stock/market-status?exchange=US&token=${API_KEY}`);
    const data = await response.json();
    return data.isOpen;
}