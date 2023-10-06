const mongoose = require('mongoose');

// unique readings for each sensor are time and temperature
const readingSchema = new mongoose.Schema({
    time: Date,
    temperature: Number
});

// define the sensor schema - id, name and address are constant and readins are updated 
// as per the readings schema
const sensorSchema = new mongoose.Schema({
    id: Number,
    name: String,
    address: String,
    readings: [readingSchema]
}, {
    collection: 'sensors'
});

module.exports = {
    SensorModel: mongoose.model('Sensor', sensorSchema)
};