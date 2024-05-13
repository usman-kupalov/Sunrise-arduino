const IotApi = require('@arduino/arduino-iot-client');
const rp = require('request-promise');
const { calc } = require('./library');
const axios = require('axios');

async function getToken() {
  const options = {
    method: 'POST',
    url: 'https://api2.arduino.cc/iot/v1/clients/token',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    json: true,
    form: {
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      audience: 'https://api2.arduino.cc/iot',
    },
  };

  try {
    const response = await rp(options);
    return response['access_token'];
  } catch (error) {
    console.error('Failed getting an access token: ' + error);
  }
}

async function run() {
  const client = IotApi.ApiClient.instance;
  const oauth2 = client.authentications['oauth2'];
  oauth2.accessToken = await getToken();

  try {
    const api = new IotApi.DevicesV2Api(client);
    const devices = await api.devicesV2List();
    // console.log(devices);

    const deviceID = process.env.DEVICE_ID;
    const thingID = process.env.THING_ID;

    var thingsAPI = new IotApi.ThingsV2Api(client);
    var opts = {
      deviceId: deviceID,
      ids: [thingID],
      showProperties: true,
    };

    const thingData = await thingsAPI.thingsV2List(opts);
    // console.log(thingData);
    // console.log(thingData[0].properties);
    console.log(
      thingData[0].properties.map((p) => {
        return { name: p.name, id: p.id, last_value: p.last_value };
      })
    );

    const propertiesAPI = new IotApi.PropertiesV2Api(client);

    await propertiesAPI.propertiesV2Publish(
      thingID,
      process.env.SUNRISE_PROPERTY_ID,
      {
        value: calc().localTimes.sunrise,
      }
    );
    console.log(`Set sunrise to '${calc().localTimes.sunrise}'`);

    await propertiesAPI.propertiesV2Publish(
      thingID,
      process.env.SUNSET_PROPERTY_ID,
      {
        value: calc().localTimes.sunset,
      }
    );
    console.log(`Set sunset to '${calc().localTimes.sunset}'`);

    const nowFormatted = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
    });
    await propertiesAPI.propertiesV2Publish(
      thingID,
      process.env.UPDATED_PROPERTY_ID,
      {
        value: nowFormatted,
      }
    );
    console.log(`Set updated to '${nowFormatted}'`);

    const airQuality = await getAirQuality();
    console.log(`Current ${airQuality.current}`);
    console.log(`Daily weather ${JSON.stringify(airQuality.hourly, null, 2)}`);
  } catch (err) {
    console.log('ERROR', err);
  }
}

async function getAirQuality() {
  const apiKey = process.env.AIRNOW_API_KEY;  // Ensure you have this in your environment variables
  const endpointUrl = "https://www.meteosource.com/api/v1/free/point";  // Hypothetical endpoint

  try {
    const response = await axios.get(endpointUrl, {
      headers: {
        'X-API-Key': apiKey  // Set API key in the header
      },
      params: {
        lat: 41.311081,
        lon: 69.240562,
        sections: "current,hourly",
        timezone: "Asia/Tashkent",
        language: "en",
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch air quality data:', error);
    throw error;
  }
}

run();
