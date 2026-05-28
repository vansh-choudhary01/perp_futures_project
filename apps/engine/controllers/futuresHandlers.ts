import type { ToEngine } from "commons/client";
import { balances, positions, type EngineRequest } from "..";
import { INDEXPRICES, type OrderRecord } from "../store/perps-store";
import { createOrderObj, createPositionObj, handleOrder } from "./futuresControllers";

// type PRICESINDEX = keyof typeof INDEXPRICES;

export function createOrder(message: ToEngine): OrderRecord {
    // create order
    if (message.messageType !== "create_order") return {} as OrderRecord;
    console.log(JSON.stringify(message));
    const order = createOrderObj(message);

    console.log(JSON.stringify(order));
    if (message.type !== "liquidation") {
        const indexPrice = INDEXPRICES[order.symbol];
        const balance = balances.get(order.userId)!["USDT"]!;

        if (balance.available < order.margin) {
            order.status = "cancelled";
            return order;
        } else if (order.leverage > indexPrice.leverageThresold) {
            order.status = "cancelled";
            return order;
        }

        balance.available -= order.margin;
        balance.locked += order.margin;

        const position = createPositionObj(order);

        positions.set(order.orderId, position);
        order.position = position;
    }
    
    handleOrder(order);
    return order;
}