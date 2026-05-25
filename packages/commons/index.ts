export type ToEngine = {
    messageType: "onramp",
    userId: string,
    amount: number
    loopBackId?: string
} | {
    messageType: "create_order",
    price: string,
    qty: string,
    side: "sort" | "long",
    marketId: string,
    type: "limit" | "market",
    equity: string,
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
}