import type { ToEngine } from "commons/client";
import { createClient } from "redis";

const client = createClient();
client.connect()

const subscriber = createClient();
subscriber.connect();

const BACKEND_CONSUMER_GROUP = "backend-" + Math.random();

client.xGroupCreate("to-backend", BACKEND_CONSUMER_GROUP, "$", {
    MKSTREAM: true
});


const loopbackResolves = new Map<string, (value?: unknown) => void>

export function loopback(message: ToEngine) {
    return new Promise(async (resolve, reject) => {
        const loopBackId = Math.random().toString();
        console.log("before publish")
        console.log({loopBackId, ...message});
        await client.xAdd("engine", "*", {loopBackId, ...message} as Record<string, string>);
        console.log("after publish")
        loopbackResolves.set(loopBackId, resolve);
        setTimeout(() => {
            if (loopbackResolves.get(message.loopBackId as string)) {
                reject();
                loopbackResolves.delete(message.loopBackId as string);
            }
        }, 10000);
    })
}


async function main() {
    while(1) {
        const response = await subscriber.xReadGroup(BACKEND_CONSUMER_GROUP, BACKEND_CONSUMER_GROUP, [{
            key: "to-backend",
            id: ">"
        }], {
            BLOCK: 0,
            COUNT: 1
        }) as any[];

        if (!response) {
            continue;
        }
    
    
        const message: {
            loopBackId: string
        } = response[0].messages[0].message
    
        loopbackResolves.get(message.loopBackId)?.(message);
        loopbackResolves.delete(message.loopBackId);
    }
}


main();