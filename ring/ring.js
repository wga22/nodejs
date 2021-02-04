//https://github.com/dgreif/ring
//https://developer.amazon.com/blogs/alexa/post/7064802d-1f63-4be1-aa78-8a65bc1016b4/alexa-arm-my-security-system-customers-can-now-control-their-security-systems-with-alexa-using-the-security-panel-controller-api
//refresh token: npx -p ring-client-api ring-auth-cli
// arm the ring alarm (use cron to call nightly)

var fs = require('fs');
const RingApi = require ('ring-client-api').RingApi;	//https://www.npmjs.com/package/ring-client-api
const JSONFILE = "./ring_config.json";
const RingDeviceType = require ('ring-client-api').RingDeviceType;
var  ENABLEALARM = true;
var token;
var ringApi2;
async function loadConfig()
{
	//TODO: for odd reason, this arg work needs to be BEFORE loading config file
	var myArgs = process.argv.slice(2);
	if(myArgs.length > 0)
	{
		ENABLEALARM = !("DISABLE" == myArgs[0]);
	}
	console.log("USAGE: ring.js <DISABLE>");
	console.log("full args: " + JSON.stringify(process.argv));
	console.log("args: " + JSON.stringify(myArgs));
	try 
	{
		var jsonString = fs.readFileSync(JSONFILE).toString();
		token = JSON.parse(jsonString).refreshToken;
	} 
	catch (err) 
	{
		console.warn("The file '"+JSONFILE+"' does not exist or contains invalid arguments!");
		process.exit(1);
	}

	
}
async function turnOnOffAlarm(fEnableAlarm) 
{
   ringApi2 = new RingApi({
      // Replace with your refresh token
      refreshToken: token,
      debug: false,
    });
	await updateToken();
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
			if(fEnableAlarm && "none"==alarmMode)
			{
				console.log("enabling alarm");
				await house.armHome();
			}
			else if ("some" == alarmMode)
			{
				console.log("disarming alarm");
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

//https://github.com/dgreif/ring/blob/02515613123584e2aafc67c84941650698f7eefc/examples/example.ts
function updateToken()	
{
  ringApi2.onRefreshTokenUpdated.subscribe(
    async ({ newRefreshToken, oldRefreshToken }) => {
      console.log('Refresh Token Updated: ', newRefreshToken)

      // If you are implementing a project that use `ring-client-api`, you should subscribe to onRefreshTokenUpdated and update your config each time it fires an event
      // Here is an example using a .env file for configuration
      if (!oldRefreshToken) {
        return
      }
		fs.writeFileSync(JSONFILE, '{"refreshToken": "' + newRefreshToken + '"}');
      //const currentConfig = await promisify(readFile)("./ring_config.json"), updatedConfig = currentConfig.toString().replace(oldRefreshToken, newRefreshToken);
      //await promisify(writeFile)("./ring_config.json", updatedConfig)
    }
  )
}



main();