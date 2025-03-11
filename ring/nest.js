//
//USAGE windows: set DEBUG=* & node nest.js

const fs = require('fs');
const axios = require('axios');
const debugNest = require('debug')('nestjs');
const JSONFILE = "./nest_config.json";
const HOST = "https://nestservices.google.com/"
const SMART = "https://smartdevicemanagement.googleapis.com/v1"
var CONFIG = {oath:"222222", project_id:"1111111", "device_id": "asfasd"};
const {google} = require('googleapis');     //https://github.com/googleapis/google-api-nodejs-client/tree/main
var authHeader;

//https://developers.google.com/nest/device-access/traits/device/thermostat-temperature-setpoint#request
/*
POST /enterprises/project-id/devices/device-id:executeCommand
{
  "command" : "sdm.devices.commands.ThermostatTemperatureSetpoint.SetRange",
  "params" : {
    "heatCelsius" : 20.0,
    "coolCelsius" : 22.0
  }
}
*/

const oauth2Client = new google.auth.OAuth2(
  YOUR_CLIENT_ID,
  YOUR_CLIENT_SECRET,
  YOUR_REDIRECT_URL
);

async function main()
{
	await loadConfig();
    authHeader = {  Authorization: CONFIG.oath,};  
    await v1test();
    //await authenticate();
    //await getTemp();
    //await setTemp();
	//debugNest("all done!" + CONFIG.device_id)
	process.exit(0);
}

async function v1test()
{
    //https://smartdevicemanagement.googleapis.com/v1/{name=enterprises/*/devices/*}
    var sURL = "https://smartdevicemanagement.googleapis.com/v1/" + CONFIG.device_id;
    await axios.get(sURL, {headers: authHeader,    }).then(response => {
    // Success!
    console.log(response.data.temperature);
      })
      .catch(error => {
        // Error!
        console.error(error);
      });     
    
}


async function getTemp()
{
    var sURL = "https://nestservices.google.com/api/v1/thermostats/" + CONFIG.device_id;
    await axios.get(sURL, {headers: authHeader,    }).then(response => {
    // Success!
    console.log(response.data.temperature);
      })
      .catch(error => {
        // Error!
        console.error(error);
      });   
}


async function setTemp(nTemp=22) 
{
	var sURL = `${HOST}partnerconnections/${CONFIG.project_id}/auth`;
    var response = await axios.get(sURL);
    var oPayLoad = {
      "command" : "sdm.devices.commands.ThermostatTemperatureSetpoint.SetRange",
      "params" : {
        "heatCelsius" : 21.0,
        "coolCelsius" : 28.0
      }
    }
    var sSetTempURL = `${HOST}enterprises/${CONFIG.project_id}/devices/${CONFIG.device_id}:executeCommand`;
    var setTemp = await axios.post(sSetTempURL, oPayLoad);
    debugNest("!!!!!!!!!!!!!");
    debugNest(response);
}

async function authenticate() 
{
    var sREDIR = `https://nestservices.google.com/api/v1/thermostats/${CONFIG.device_id}`
	var sURL = "https://nestservices.google.com/partnerconnections/"+CONFIG.project_id + "/auth? \
    redirect_uri="+sREDIR+"&\
    client_id="+CONFIG.oath+"&\
    access_type=offline&\
    prompt=consent&\
    response_type=code&\
    scope=https://www.googleapis.com/auth/sdm.service";
    var response = await axios.get(sURL);
    
    debugNest("!!!!!!!!!!!!!");
    console.log(response.data);
}



async function loadConfig()
{
	//TODO: for odd reason, this arg work needs to be BEFORE loading config file
	var myArgs = process.argv.slice(2);
	if(myArgs.length > 0)
	{
		//TODO use this? ENABLEALARM = !("DISABLE" == myArgs[0]);
	}
	console.log("USAGE: set DEBUG=* & node nest.js ");
	console.log("full args: " + JSON.stringify(process.argv));
	debugNest("loaded args: " + JSON.stringify(CONFIG));
	try 
	{
		var jsonString = fs.readFileSync(JSONFILE).toString();
        console.log(jsonString)
		CONFIG = JSON.parse(jsonString);
        //console.log(typeof CONFIG + " ------" + CONFIG.toString()) 
	} 
	catch (err) 
	{
		errorLogger("The file '"+JSONFILE+"' does not exist or contains invalid arguments!");
		process.exit(1);
	}
}

//https://github.com/dgreif/ring/blob/02515613123584e2aafc67c84941650698f7eefc/examples/example.ts
function updateToken()	
{
  ringApi2.onRefreshTokenUpdated.subscribe(
    async ({ newRefreshToken, oldRefreshToken }) => 
    {
        debugToken('Refresh Token Updated: ', newRefreshToken)

        // If you are implementing a project that use `ring-client-api`, you should subscribe to onRefreshTokenUpdated and update your config each time it fires an event
        // Here is an example using a .env file for configuration
        if (!oldRefreshToken) 
        {
            return;
        }
        fs.writeFileSync(JSONFILE, '{"refreshToken": "' + newRefreshToken + '"}');
        //const currentConfig = await promisify(readFile)("./ring_config.json"), updatedConfig = currentConfig.toString().replace(oldRefreshToken, newRefreshToken);
        //await promisify(writeFile)("./ring_config.json", updatedConfig)
    }
  )
}


/////////////////////////  MAIN		///////////////////////////////
main();



function ping(oSite)
{
	const sURL = oSite.url;
	logger.debug("ping: " + sURL);
	axios.get(sURL).then((response) => {
		oSite.lastSeen = new Date();
		handleSuccess(oSite);
	}, 
	(error) => 
	{
		handleFail(oSite);
	}
	);
}

