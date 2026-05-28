import { createClient } from "redis";

type Side = "LONG" | "SORT";
type OrderStatus = "open" | "partially_filled" | "filled" | "cancelled";
type OrderType = "market" | "limit";
type Symbol = "SOL" | "ETH";

interface ToPoller {
    messageType: "create_order"
    order: string,
}

interface OrderRecord {
  orderId: string;
  userId: string;
  side: Side;
  type: OrderType;
  symbol: Symbol;
  price: number | null;
  qty: number;
  margin: number;
  indexPrice: number;
  leverage: number;
  filledQty: number;
  totalPrice: number;
  averagePrice: number;
  status: OrderStatus;
  fills: Fill[];
  position?: Position
  createdAt: number;
}

interface Fill {
  fillId: string;
  symbol: string;
  price: number;
  qty: number;
  buyOrderId: string;
  sellOrderId: string;
  createdAt: number;
}

const client = createClient();
await client.connect();

async function poller() {
    while(1) {
        const response = await client.xReadGroup("db-poller", "to-backend", [{
            key: "db-poller",
            id: ">"
        }], {
            BLOCK: 0,
            COUNT: 1
        }) as any[];

        if (!response) {
            console.log("nothing found");
            continue;
        }

        console.log(response);

        const message: ToPoller = response[0].messages[0].message;
        const order: OrderRecord = JSON.parse(message.order);
    }
}