import type { ToEngine } from "commons/client";
import { balances, orderbooks, positions, type EngineRequest, type OpenOrder, type Position } from "..";
import { INDEXPRICES, type Fill, type OrderRecord, type OrderType, type Side, type Symbol } from "../store/perps-store";
// import { INDEXPRICES, ORDERBOOKS, POSITIONS, type Fill, type OrderRecord, type OrderType, type Position, type RestingOrder, type Side, type Symbol } from "../store/perps-store";
type IndexPrice = keyof typeof INDEXPRICES;
// type IndexSymbol = keyof typeof ORDERBOOKS;

export function createOrderObj(message: ToEngine): OrderRecord {
    if (message.messageType !== "create_order") return {} as OrderRecord;
    const indexPrice = INDEXPRICES[message.symbol as IndexPrice].indexPrice;
    const leverage: number = message.type === "liquidation" ? 1 : (Number(message.qty) * indexPrice) / (Number(message.equity));
    return {
        orderId: crypto.randomUUID(),
        userId: String(message.userId),
        side: message.side as Side,
        type: message.type as OrderType,
        symbol: message.symbol as Symbol,
        price: Number(message.price),
        qty: Number(message.qty),
        margin: Number(message.equity),
        indexPrice,
        leverage,
        filledQty: 0,
        totalPrice: 0,
        averagePrice: 0,
        status: 'open',
        fills: [],
        createdAt: Date.now()
    }
}

export function createPositionObj(order: OrderRecord): Position {
    const indexPrice = INDEXPRICES[order.symbol as IndexPrice].indexPrice;
    return {
        originalOrderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        qty: order.filledQty,
        margin: order.margin,
        leverage: order.leverage,
        liquidationPrice: indexPrice - (order.margin / order.qty), // TODO
        pnL: (order.filledQty * INDEXPRICES[order.symbol as IndexPrice].indexPrice) - (order.filledQty * order.averagePrice),
        averagePrice: order.averagePrice,
        userId: order.userId
    }
}

export function handleOrder(order: OrderRecord) {
    if (order.side === "LONG") {
        handleLongOrder(order);
    } else if (order.side === "SORT") {
        handleSortOrder(order);
    }
}

export function handleLongOrder(order: OrderRecord) {
    // user wanna buy first sell last
    let remainingQty = order.qty - order.filledQty;
    const bidsPrices = orderbooks[order.symbol as Symbol]?.bids;
    const asksPrices = orderbooks[order.symbol as Symbol]?.asks;
    while (remainingQty > 0) {
        const minSeller = asksPrices?.minNode();

        // first i check is minSeller.orders is empty -> add in orderbook
        // partialfill / fullfill
        const restingOrder: OpenOrder = {
            // orderId: order.orderId,
            originalOrderId: order.orderId,
            userId: order.userId,
            // side: order.side,
            // type: "limit",
            // symbol: order.symbol,
            price: order.price!,
            qty: order.qty,
            filledQty: order.filledQty,
            // totalPrice: order.totalPrice,
            // averagePrice: order.averagePrice,
            // status: order.filledQty > 0 ? "partially_filled" : "open",
            // createdAt: Date.now()
        }
        if (!minSeller || !minSeller.data?.openOrders?.length || minSeller.key > order.price!) {
            if (order.type === "market") {
                order.status = order.filledQty > 0 ? "partially_filled" : "cancelled";
                return;
            }
            const bidRestingOrders = bidsPrices?.find(order.price!);
            if (bidRestingOrders) {
                bidRestingOrders.data?.openOrders.push(restingOrder);
            } else {
                bidsPrices?.insert(order.price!, {
                    availableQty: remainingQty,
                    openOrders: [restingOrder]
                })
            }

            remainingQty = 0;
        } else {
            const firstRestingOrder = minSeller.data.openOrders[0]!;
            if (firstRestingOrder?.qty! - firstRestingOrder?.filledQty! < remainingQty) {
                const swapQty = firstRestingOrder.qty - firstRestingOrder.filledQty;
                handleFill(firstRestingOrder!, order, swapQty);
                minSeller.data.openOrders.shift();
                if (!minSeller.data.openOrders.length) {
                    asksPrices?.remove(minSeller.key);
                }
            } else {
                const swapQty = order.qty - order.filledQty;
                handleFill(firstRestingOrder!, order, swapQty);
            }
        }
    }

    if (order.qty === order.filledQty) {
        order.status = "filled";
    } else if (order.filledQty > 0) {
        order.status = "partially_filled";
    }

    return order;
}

export function handleSortOrder(order: OrderRecord) {
    // user wanna sell first buy last
    let remainingQty = order.qty - order.filledQty;
    const bidsPrices = orderbooks[order.symbol as Symbol]?.bids;
    const asksPrices = orderbooks[order.symbol as Symbol]?.asks;
    while (remainingQty > 0) {
        const maxBuyer = bidsPrices?.maxNode();

        // first i check is maxBuyer.orders is empty -> add in orderbook
        // partialfill / fullfill
        const restingOrder: OpenOrder = {
            // orderId: order.orderId,
            originalOrderId: order.orderId,
            userId: order.userId,
            // side: order.side,
            // type: "limit",
            // symbol: order.symbol,
            price: order.price!,
            qty: order.qty,
            filledQty: order.filledQty,
            // totalPrice: order.totalPrice,
            // averagePrice: order.averagePrice,
            // status: order.filledQty > 0 ? "partially_filled" : "open",
            // createdAt: Date.now()
        }
        if (!maxBuyer || !maxBuyer.data?.openOrders?.length || maxBuyer.key < order.price!) {
            if (order.type === "market") {
                order.status = order.filledQty > 0 ? "partially_filled" : "cancelled";
                return;
            }
            const askRestingOrders = asksPrices?.find(order.price!);
            if (askRestingOrders) {
                askRestingOrders.data?.openOrders.push(restingOrder);
            } else {
                asksPrices?.insert(order.price!, {
                    availableQty: remainingQty,
                    openOrders: [restingOrder]
                })
            }

            remainingQty = 0;
        } else {
            const firstRestingOrder = maxBuyer.data.openOrders[0]!;
            if (firstRestingOrder?.qty! - firstRestingOrder?.filledQty! < remainingQty) {
                const swapQty = firstRestingOrder.qty - firstRestingOrder.filledQty;
                handleFill(firstRestingOrder!, order, swapQty);
                maxBuyer.data.openOrders.shift();
                if (!maxBuyer.data.openOrders.length) {
                    bidsPrices?.remove(maxBuyer.key);
                }
            } else {
                const swapQty = order.qty - order.filledQty;
                handleFill(firstRestingOrder!, order, swapQty);
            }
        }
    }

    if (order.qty === order.filledQty) {
        order.status = "filled";
    } else if (order.filledQty > 0) {
        order.status = "partially_filled";
    }

    return order;
}

export function handleFill(firstRestingOrder: OpenOrder, order: OrderRecord, swapQty: number) {
    const fill: Fill = {
        fillId: crypto.randomUUID(),
        symbol: order.symbol,
        price: firstRestingOrder.price,
        qty: swapQty,
        buyOrderId: firstRestingOrder.originalOrderId,
        sellOrderId: order.orderId,
        createdAt: Date.now()
    }

    firstRestingOrder.filledQty += swapQty;
    // firstRestingOrder.totalPrice += fill.price * fill.qty;
    // firstRestingOrder.averagePrice = firstRestingOrder.filledQty * firstRestingOrder.averagePrice!;

    order.filledQty += swapQty;
    order.totalPrice += fill.price * fill.qty;
    order.averagePrice = order.filledQty * order.averagePrice;
    order.fills.push(fill);

    // opponenet ka resting order update
    const opponentPosition = positions.get(firstRestingOrder.originalOrderId)!;
    opponentPosition.qty += swapQty;
    opponentPosition.averagePrice = ((opponentPosition.averagePrice * opponentPosition.qty) + (fill.price * fill.qty)) / (opponentPosition.qty + fill.qty);
    // opponentPosition.liquidationPrice = 0; // TODO

    // TODO - UPDATE BALANCE 
}