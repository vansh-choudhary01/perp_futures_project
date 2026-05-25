
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

export class Orderbook {
    private marketId: string;
    private bids: Bid[];
    private asks : Ask[]
    constructor(marketId: string) {
        this.marketId = marketId;
        this.bids = [];
        this.asks = [];
    }

}