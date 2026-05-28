import jwt from "jsonwebtoken";
import express from "express";
import { prisma } from "@repo/db/client";
import { authMiddleware } from "./middleware";
import { loopback } from "./loopback";

const app = express();
app.use(express.json());

app.post("/api/v1/signup", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(411).json({});
        return;
    }

    const response = await prisma.user.create({
        data: {
            username,
            password
        }
    });

    const queueLoopbackResponse = await loopback({
        messageType: "create_balance",
        userId: response.id,
    })

    res.json({
        id: response.id
    })
})

app.post("/api/v1/signin", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(411).json({});
        return;
    }

    const response = await prisma.user.findFirst({
        where: {
            username,
            password
        }
    })

    if (!response) {
        res.status(403).json({
            message: "Incorrect creds"
        })
        return
    }

    res.json({
        token: jwt.sign({
            userId: response.id
        }, process.env.JWT_SECRET!)
    })
})


app.post("/admin/market", async (req, res) => {
    const { symbol, imageUrl } = req.body;
    const token = req.headers.token;
    console.log("hellooooeoeo");
    console.log(process.env.ADIMN_SECRET)
    console.log(token)

    if (token != process.env.ADIMN_SECRET) {
        res.status(403).json({})
        return;
    }

    console.log("hellohello")

    const response = await prisma.market.create({
        data: {
            slug: symbol,
            imageUrl
        }
    })
    console.log(response);

    // const queueResponse = await client.xAdd("engine-queue", "*", );
    console.log("hi")

    const queueLoopbackResponse = await loopback({
        messageType: "create_market",
        marketId: response.id,
        marketSymbol: symbol
    })
    console.log("hello")


    res.json({
        id: response.id
    })

})

app.post("/api/v1/onramp", authMiddleware, async (req, res) => {
    const userId: string = req.userId!;

    const queueLoopbackResponse = await loopback({
        messageType: "onramp",
        userId: userId,
        amount: req.body.amount.toString()
    })

    // console.log(response);
    console.log(queueLoopbackResponse);
    res.json(queueLoopbackResponse);
})


app.post("/api/v1/order", authMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { price, qty, side, symbol, type, equity } = req.body;

    const queueLoopbackResponse: {
        loopBackId: string,
        messageType: string,
        order: string,
    } = await loopback({
        messageType: "create_order",
        price,
        qty,
        side,
        symbol,
        type,
        equity,
        userId,
    }) as any;

    if (queueLoopbackResponse) queueLoopbackResponse.order = JSON.parse(queueLoopbackResponse.order);
    console.log(queueLoopbackResponse);
    res.status(200).json(queueLoopbackResponse.order);
})

app.listen(3000, () => {
    console.log("server is running on 3000");
});