export type ToEngine = {
    messageType: "onramp",
    userId: string,
    amount: string
    loopBackId?: string
} | {
    messageType: "create_order",
    price?: string,
    qty: string,
    side: "SORT" | "LONG",
    symbol: any,
    type: "limit" | "market" | "liquidation",
    equity?: string,
    userId: string,
    orderId?: string
    loopBackId?: string
} | {
    messageType: "cancel_order",
    orderId: string,
    userId: string
    loopBackId?: string
} | {
    messageType: "create_market",
    marketId: string
    loopBackId?: string
    marketSymbol: string
} | {
    messageType: "create_balance",
    userId: string,
    loopBackId?: string
}