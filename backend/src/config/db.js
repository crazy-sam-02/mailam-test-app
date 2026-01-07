const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI environment variable is not set");
    }
    await mongoose.connect(uri, {
      // Better defaults for production hosts
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 0),
      serverSelectionTimeoutMS: Number(
        process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10_000
      ),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45_000),
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error(
      "Mongo connection error:",
      err && err.message ? err.message : err
    );
    process.exit(1);
  }
};

module.exports = connectDB;
