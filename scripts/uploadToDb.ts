import { vars } from "hardhat/config";

const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = vars.has('MONGODB_URI') ? vars.get('MONGODB_URI') : null;

const connectDb = async () => {
    const client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });

    await client.connect();
    const dbo = await client.db("aave_simulation");
    await dbo.command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    return dbo.collection("simulation_data");
}

export const upload = async (data: any) => {
    try {
        const dbo = await connectDb();
        const result = await dbo.insertMany([data]);
        return result;
    } catch (error) {
        console.error("Error in connecting to Db");
        process.exit(0);
    }
}