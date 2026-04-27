const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        [
          "MongoDB connection error: MONGO_URI is missing.",
          "Create backend/.env and set MONGO_URI.",
          "Local MongoDB example: MONGO_URI=mongodb://127.0.0.1:27017/appointmentdashboard",
          "MongoDB Atlas: paste your Atlas connection string into MONGO_URI."
        ].join("\n")
      );
    }

    const connection = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    if (error.message.includes("ECONNREFUSED")) {
      throw new Error(
        [
          `MongoDB connection error: ${error.message}`,
          "MONGO_URI was found, but MongoDB is not reachable.",
          "Start your local MongoDB server, or replace MONGO_URI in backend/.env with a MongoDB Atlas connection string."
        ].join("\n")
      );
    }

    throw new Error(`MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
