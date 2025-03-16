const mongoose = require('mongoose');
require('dotenv').config();

const connectDB =async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
            .then(() => console.log("Database Connected Successfully"))
            .catch((err) => console.log("Error connecting to MongoDB:", err));
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('Available collections:', collections.map(c => c.name));
    } catch (error) {
        console.error("Could not connect to MongoDB:", error);
        process.exit(1);
    }
};

module.exports = connectDB;
