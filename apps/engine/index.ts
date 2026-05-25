import { createClient } from "redis";
import type { ToEngine } from "commons/client";

const client = createClient();
await client.connect()

const publisher = createClient();
await publisher.connect();
// client.xGroupCreate("engine", "engine", "$", {
//     MKSTREAM: true
// });

type OpenOrder = {
    userId: string,
    originalOrderId: string,
    qty: string,
    filledQty: string
}

type Bid = {
    availableQty: number,
    openOrders: OpenOrder[] 
}

type Ask = {
    availableQty: number,
    openOrders: OpenOrder[] 
}

interface Orderbook {
    bids: Map<string, Bid>,
    asks: Map<string, Ask>,
    marketId: string,
    lastTradedPrice: number
}

const orderbooks: Orderbook[] = [];
const balances: Map<string, {available: string, locked: string}> = new Map();

async function matching() {
    while(1) {
        const response = await client.xReadGroup("engine", "engine", [{
            key: "engine",
            id: ">"
        }], {
            BLOCK: 0,
            COUNT: 1
        }) as any[];
    
        if (!response) {
            console.log("nothing found")
            continue;
        }
    
        console.log(response);
    
        const message: {
            loopBackId: string
        } & ToEngine  = response[0].messages[0].message;
    
        if (message.messageType == "create_market"){
            orderbooks.push({
                bids: new Map(),
                asks: new Map(),
                lastTradedPrice: -1,
                marketId: message.marketId
            })
    
            console.log(orderbooks);
    
            await publisher.xAdd("to-backend", "*", {
                loopBackId: message.loopBackId
            })
    
        }
    
        if (message.messageType == "onramp") {
            balances.get(message.userId)!.available += message.amount;
            await publisher.xAdd("to-backend", "*", {
                loopBackId: message.loopBackId
            })
        }
    
        if (message.messageType === "create_order") {
            
        }
        if (message.messageType === "cancel_order") {
            
        }
    }    
}


function liquidationChecks() {
    const ws = new WebSocket("wss://stream.binance.com");
    ws.send("{MESSAGE: SUBSCRIBE, MARKET: SOL}");
    ws.onmessage = () => {
        
    }
}

matching();
liquidationChecks();