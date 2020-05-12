//https://github.com/dgreif/ring
//https://developer.amazon.com/blogs/alexa/post/7064802d-1f63-4be1-aa78-8a65bc1016b4/alexa-arm-my-security-system-customers-can-now-control-their-security-systems-with-alexa-using-the-security-panel-controller-api
// arm the ring alarm (use cron to call nightly)

var fs = require('fs');
const RingApi = require ('ring-client-api').RingApi;
const RingDeviceType = require ('ring-client-api').RingDeviceType;
var token;
async function loadConfig()
{
	try 
	{
		var jsonString = fs.readFileSync("./ring_config.json").toString();
		token = JSON.parse(jsonString).refreshToken;
	} 
	catch (err) 
	{
		console.warn("The file 'ring_config.json' does not exist or contains invalid arguments!");
		process.exit(1);
	}
}
async function turnOnAlarm() 
{
  const ringApi = new RingApi({
      // Replace with your refresh token
      refreshToken: token,
      debug: false,
    });
	const locations = await ringApi.getLocations();
	if(locations && locations.length > 0 && locations[0].hasHubs)
	{
		const house = locations[0];
		console.log("loc len:" + locations.length)
		house.armHome();
		//house.disarm();
		//console.log("Alarm has been Enabled");
		//testing for the state seems to prevent the arm from happening!
		/*
		checking mode seems to prevent later arming it!
		var currentState = await house.getAlarmMode();
		var cs = JSON.stringify(currentState);
		//console.log("state:" + cs + ": " + cs.length + " + " + (cs == '"none"'))
		//console.log(JSON.stringify(house));
		if(cs == '"none"')
		{
			house.armHome();
			house.soundSiren();
			console.log("Alarm has been Enabled");			
		}
		else
		{
			console.log("alarm already enabled");
		}
		//house.armHome();
		*/
	}
	else
	{
		console.log("Error: cannot find location");
		process.exit(1);
	}
	//location.getHistory() // historical events from alarm/lights
	return true;
}

async function testDevices() 
{
  const ringApi = new RingApi({
      // Replace with your refresh token
      refreshToken: token,
      debug: true,
    });
	const locations = await ringApi.getLocations();
	if(locations && locations.length > 0 && locations[0].hasHubs)
	{
		const house = locations[0];
		console.log("loc len:" + locations.length)
		var devices = await house.getDevices();
		house.armHome();
		console.log(`\nLocation ${house.name} has the following `);
		//const baseStation = devices.find(device => device.data.deviceType === RingDeviceType.BaseStation);
		//console.log("volume: " + baseStation.getVolume())
	}
	else
	{
		console.log("Error: cannot find location");
		process.exit(1);
	}
	//location.getHistory() // historical events from alarm/lights
	return true;
}

async function main()
{
	await loadConfig();
	//await turnOnAlarm();
	await testDevices();
	console.log("all done!")
	process.exit(0);
}
main();