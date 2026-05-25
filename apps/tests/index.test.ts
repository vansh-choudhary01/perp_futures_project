import axios, { AxiosError } from "axios";
import { beforeAll, describe, expect, it } from "bun:test";
import { BACKEND } from "./config";

// unit tests vs integration tests

describe.todo("auth endpoints", () => {
    const username = `harkirat + ${Math.random()}`
    it("Signup doesnt work if username isnt provided", async () => {
        try {
            const response = await axios.post(`${BACKEND}/api/v1/signup`, {
                password: "123123"
            })
    
            expect().fail();
        } catch(e) {

            if (e instanceof AxiosError) {
                expect(e.response?.status).toBe(411);
            } else {
                expect().fail();
            }
        }
    })

    it("Signup does work if username isnt provided", async () => {
            const response = await axios.post(`${BACKEND}/api/v1/signup`, {
                username,
                password: "123123"
            })
            expect(response.data.id).not.toBe(undefined);
    })

    it("Signin doesnt work if username isnt provided", async () => {
        try {
            const response = await axios.post(`${BACKEND}/api/v1/signin`, {
                password: "123123"
            })
    
            expect().fail();
        } catch(e) {

            if (e instanceof AxiosError) {
                expect(e.response?.status).toBe(411);
            } else {
                expect().fail();
            }
        }
    })

    it("Signin doesnt work if wrong credentials are sent", async () => {
        try {
            const response = await axios.post(`${BACKEND}/api/v1/signin`, {
                username,
                password: "123randomsomodmomdom"
            })
    
            expect().fail();
        } catch(e: any) {
            expect(e.status).toBe(403);
        }
    })

    it("Signup does work if username isnt provided", async () => {
            const response = await axios.post(`${BACKEND}/api/v1/signin`, {
                username,
                password: "123123"
            })
            console.log(response.data);
            expect(response.status).toBe(200)
            expect(response.data.token).not.toBe(undefined);
    })
})

describe("Order endpoints", () => {
    const USER1 = `harkirat-${Math.random()}`
    const USER2 = `harkirat-${Math.random()}`
    const PASSWORD = "123random";
    let MARKET_ID: string = "";
    let user1Token: string = "";
    let user2Token: string = "";

    beforeAll(async () => {

        const marketResponse = await axios.post(`${BACKEND}/admin/market`, {
            symbol: "SOL",
            imageUrl: "sol.png"
        }, {
            headers: {
                token: "123random"
            }
        })

        MARKET_ID = marketResponse.data.id;
        console.log(`market created ${MARKET_ID}`)

        // await axios.post(`${BACKEND}/api/v1/signup`, {
        //     username: USER1,
        //     password: PASSWORD
        // });
        // await axios.post(`${BACKEND}/api/v1/signup`, {
        //     username: USER2,
        //     password: PASSWORD
        // });

        // const response1 = await axios.post(`${BACKEND}/api/v1/signin`, {
        //     username: USER1,
        //     password: PASSWORD
        // });

        // const response2 = await axios.post(`${BACKEND}/api/v1/signin`, {
        //     username: USER2,
        //     password: PASSWORD
        // });

        // user1Token = response1.data.token;
        // user2Token = response2.data.token;

        // await axios.post(`${BACKEND}/api/v1/onramp`, {
        //     amount: 100000
        // }, {
        //     headers: {
        //         token: user1Token
        //     }
        // })

        // await axios.post(`${BACKEND}/api/v1/onramp`, {
        //     amount: 100000
        // }, {
        //     headers: {
        //         token: user2Token
        //     }
        // })
    })

    // it("First order should sit on the book with 0 filled qty", async () => {
    //     const response = await axios.post(`${BACKEND}/api/v1/order`, {
    //         price: 100,
    //         qty: 10,
    //         side: "long",
    //         marketId: MARKET_ID,
    //         type: "limit",
    //         equity: 1000
    //     }, {
    //         headers: {
    //             token: user1Token
    //         }
    //     })

    //     expect(response.status).toBe(200);
    //     expect(response.data.filledQty).toBe(0);
    //     expect(response.data.orderId).toBeDefined();
    // })

    // it("SEcond order should sit on the book if not matched", async () => {
    //     const response = await axios.post(`${BACKEND}/api/v1/order`, {
    //         price: 102,
    //         qty: 10,
    //         side: "short",
    //         marketId: MARKET_ID,
    //         type: "limit",
    //         equity: 1000
    //     }, {
    //         headers: {
    //             token: user2Token
    //         }
    //     })

    //     expect(response.status).toBe(200);
    //     expect(response.data.filledQty).toBe(0);
    //     expect(response.data.orderId).toBeDefined();
    // })

    
    // it("Third order should match", async () => {
    //     const response = await axios.post(`${BACKEND}/api/v1/order`, {
    //         price: 100,
    //         qty: 20,
    //         side: "short",
    //         marketId: MARKET_ID,
    //         type: "limit",
    //         equity: 1000
    //     }, {
    //         headers: {
    //             token: user2Token
    //         }
    //     })

    //     expect(response.status).toBe(200);
    //     expect(response.data.filledQty).toBe(10);
    //     expect(response.data.orderId).toBeDefined();
    // })

    
})