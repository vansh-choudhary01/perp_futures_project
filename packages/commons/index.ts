export type ToEngine = {
    messageType: "onramp",
    userId: string,
    amount: number
    loopBackId?: string
} | {
    messageType: "create_order",
    price?: number,
    qty: number,
    side: "sort" | "long",
    symbol: any,
    type: "limit" | "market" | "liquidation",
    equity?: number,
    userId: string,
    orderId: string
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
}