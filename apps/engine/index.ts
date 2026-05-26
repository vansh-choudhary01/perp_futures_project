import { createClient } from "redis";
import type { ToEngine } from "commons/client";
import { AVLTreeInit } from "./algos/avl";
import { AVLTree } from "avl";
import { createOrder } from "./controllers/futuresHandlers";
import { MaxHeap, MinHeap } from "./algos/heap";
import { INDEXPRICES } from "./store/perps-store";

const client = createClient();
await client.connect()

const publisher = createClient();
await publisher.connect();
// client.xGroupCreate("engine", "engine", "$", {
//     MKSTREAM: true
// });
export type Side = "LONG" | "SORT";

export type OpenOrder = {
    userId: string,
    originalOrderId: string,
    price: number;
    qty: number,
    filledQty: number
}

export type Bid = {
    availableQty: number,
    openOrders: OpenOrder[]
}

type Ask = {
    availableQty: number,
    openOrders: OpenOrder[]
}

interface Orderbook {
    bids: AVLTree<number, Bid>,
    asks: AVLTree<number, Ask>,
    marketId: string,
    lastTradedPrice: number
}

export type EngineCommandType =
    | "create_order"
    | "get_depth"
    | "get_user_balance"
    | "get_orders"
    | "get_order"
    | "cancel_order"
    | "update_balance";

export interface EngineRequest {
    correlationId: string;
    responseQueue: string;
    type: EngineCommandType;
    payload: Record<string, unknown>;
}

export type Orderbooks = Record<string, Orderbook>
// const orderbooks: Orderbook[] = [];
export const orderbooks: Orderbooks = {
    SOL: { bids: AVLTreeInit.create("new"), asks: AVLTreeInit.create("new"), lastTradedPrice: 90, marketId: crypto.randomUUID() },
    ETH: { bids: AVLTreeInit.create("new"), asks: AVLTreeInit.create("new"), lastTradedPrice: 1900, marketId: crypto.randomUUID() }
}

export interface Balance {
    available: number;
    locked: number;
    //   leverageAmount: number;
}
export const balances: Map<string, Record<string, Balance>> = new Map();

export interface Position {
    originalOrderId: string,
    symbol: "SOL" | "ETH",
    side: Side,
    qty: number,
    margin: number,
    leverage: number,
    liquidationPrice: number,
    pnL: number,
    averagePrice: number,
    userId: string
}
export const positions = new Map<string, Position>();
export const liquidationPositions = {
    LONG: new MinHeap(),
    SORT: new MaxHeap(),
}

async function matching() {
    while (1) {
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
        } & ToEngine = response[0].messages[0].message;

        if (message.messageType == "create_market") {
            orderbooks[message.marketSymbol] = {
                bids: AVLTreeInit.create("new"),
                asks: AVLTreeInit.create("new"),
                lastTradedPrice: -1,
                marketId: message.marketId
            }

            console.log(orderbooks);

            await publisher.xAdd("to-backend", "*", {
                loopBackId: message.loopBackId
            })

        }

        if (message.messageType == "onramp") {
            balances.get(message.userId)!["USDT"]!.available += message.amount;
            await publisher.xAdd("to-backend", "*", {
                loopBackId: message.loopBackId
            })
        }

        if (message.messageType === "create_order") {
            const order = createOrder(message);
            await publisher.xAdd("to-backend", "*", {
                loopBackId: message.loopBackId,
                order: JSON.stringify(order),
            })
        }
        if (message.messageType === "cancel_order") {

        }
    }
}


function liquidationChecks() {
    const ws = new WebSocket("wss://stream.binance.com");
    ws.send("{MESSAGE: SUBSCRIBE, MARKET: SOL}");
    ws.onmessage = (message) => {
        const msg = {
            market: "SOL",
            indexPrice: 95
        }
        INDEXPRICES['SOL'].indexPrice = msg.indexPrice;

        const indexPrice = msg.indexPrice;
        while(liquidationPositions.LONG.getTop() && indexPrice < liquidationPositions.LONG.getTop()!.price) {
            const position = positions.get(liquidationPositions.LONG.getTop()!.orderId);
            const message: ToEngine = {
                messageType: "create_order",
                qty: position!.qty,
                side: "sort",
                symbol: position?.symbol,
                type: "liquidation",
                userId: position!.userId,
                orderId: position!.originalOrderId
            };

            const order = createOrder(message);
            publisher.xAdd("to-backend", "*", {
                order: JSON.stringify(order)
            })
        }

        while(liquidationPositions.SORT.getTop() && indexPrice > liquidationPositions.SORT.getTop()!.price) {
            const position = positions.get(liquidationPositions.LONG.getTop()!.orderId);
            const message: ToEngine = {
                messageType: "create_order",
                qty: position!.qty,
                side: "long",
                symbol: position?.symbol,
                type: "liquidation",
                userId: position!.userId,
                orderId: position!.originalOrderId
            };

            const order = createOrder(message);
            publisher.xAdd("to-backend", "*", {
                order: JSON.stringify(order)
            })
        }
    }
}

matching();
liquidationChecks();