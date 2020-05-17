//https://github.com/dgreif/ring
//https://developer.amazon.com/blogs/alexa/post/7064802d-1f63-4be1-aa78-8a65bc1016b4/alexa-arm-my-security-system-customers-can-now-control-their-security-systems-with-alexa-using-the-security-panel-controller-api
// arm the ring alarm (use cron to call nightly)

var fs = require('fs');
const RingApi = require ('ring-client-api').RingApi;
const RingDeviceType = require ('ring-client-api').RingDeviceType;
var  ENABLEALARM = true;
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
	var myArgs = process.argv.slice(2);
	if(myArgs.length > 0)
	{
		ENABLEALARM = !("DISABLE" == myArgs[0]);
	}
	console.log("USAGE: ring.js <DISABLE>");
	
}
async function turnOnOffAlarm(fEnableAlarm) 
{
   var ringApi2 = new RingApi({
      // Replace with your refresh token
      refreshToken: token,
      debug: false,
    });
	var locations = await ringApi2.getLocations();
	if(locations && locations.length > 0 && locations[0].hasHubs)
	{
		var house = locations[0];
		var alarmMode = await house.getAlarmMode();
		console.log("current mode:" + alarmMode);
		var fAway = ("all"==alarmMode);
		if(fAway)
		{
			console.log("away, so dont touch the alarm");
		}
		else
		{ //home modes
			if(fEnableAlarm)
			{
				await house.armHome();
			}
			else
			{
				//dont want to do this if away!
				await house.disarm();
			}			
		}
	}
	else
	{
		console.log("Error: cannot find location");
		process.exit(1);
	}
	return true;
}


async function main()
{
	await loadConfig();
	await turnOnOffAlarm(ENABLEALARM);
	console.log("all done!")
	process.exit(0);
}
main();