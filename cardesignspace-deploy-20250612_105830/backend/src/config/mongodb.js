const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const MONGODB_URI = process.env.MONGODB_URI;

const connectMongoDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('MongoDB connection has been established successfully.');
  } catch (error) {
    logger.error('Unable to connect to the MongoDB database:', error);
    process.exit(1);
  }
};

module.exports = {
  connectMongoDB
}; 