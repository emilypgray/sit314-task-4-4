const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');
const plotly = require('plotly')('epgray', 'SEv5Zoj5qcgP194CyAWY');
const { SensorModel } = require('./models/sensor');

const dbURL = 'mongodb+srv://egra5170:uW2RieJ5tTnINX1m@cluster0.i1q5aw9.mongodb.net/sit314_task_4_4?retryWrites=true&w=majority';

const data = {
    x: [],
    y: [],
    type: "scatter",
    name: "Sensor Data"
};

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(dbURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tlsInsecure: true
});

const db = mongoose.connection;
db.on('connected', () => console.log('Mongoose successfully connected to database.'));
db.on('error', (err) => console.log('Mongoose connection error:', err));
db.on('disconnected', () => console.log('Mongoose connection disconnected.'));


async function saveToDatabase(id, name, address, parsedTime, temperature) {
    try {
        const sensor = await SensorModel.findOne({ id: id });
        
        if (!sensor) {
            // If the sensor does not exist, create a new one
            const newSensor = new SensorModel({
                id: id,
                name: name,
                address: address,
                readings: [{
                    time: parsedTime,
                    temperature: parseFloat(temperature)
                }]
            });
            await newSensor.save();
            console.log('Data saved to MongoDB Atlas');
        } else {
            // If the sensor exists, push the new reading to its readings array
            sensor.readings.push({
                time: parsedTime,
                temperature: parseFloat(temperature)
            });
            await sensor.save();
        }
    } catch (error) {
        console.error(`Error saving to database: ${error.message}`);
        throw error;  
    }
}

app.post('/temperature', async (req, res) => {
    console.log("Data Received:", req.body);
    
    // Data validation
    const { temperature, time, id, name, address } = req.body;
    if (!temperature || !time || !id || !name || !address) {
        return res.status(400).send("Missing required fields.");
    }
    
    // convert the time reading to correct timezon
    let timeMoment = moment.tz(time, "YYYY-MM-DD HH:mm:ss", "UTC");
    timeMoment = timeMoment.tz('Australia/Sydney');
    const parsedTime = timeMoment.toDate();

    try {
        // attempt to save the data to mongoDb atlas
        await saveToDatabase(id, name, address, parsedTime, temperature);
        console.log();

        // push the timestamp and temperature to the data dict
        data.x.push(parsedTime);
        data.y.push(parseFloat(temperature));

        // push the data to plot.ly
        const graphOptions = { filename: 'iot-performance', fileopt: 'overwrite' };
        plotly.plot(data, graphOptions, (err, msg) => {
            if (err) return console.error(err);
            console.log(msg);
        });
        res.send('Data saved.');
    } catch (error) {
        console.error("Error while processing:", error);
        res.status(500).send("Error saving data");
    }
});

// start the server
app.listen(3000, () => {
    console.log('Server started on port 3000');
});
