import mongoose from "mongoose";

export default async function ConnectDb() {
  if (mongoose.connections[0].readyState) return;
  try {
    mongoose.connect(process.env.DATABASE_URI);
    console.log("connected to db successfully");
  } catch (error) {
    console.log("connect to db failed");
  }
}
