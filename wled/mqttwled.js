const mqtt = require('mqtt');
const fs = require('fs');	//https://nodejs.org/api/fs.html
const { createLogger, format, transports } = require('winston');
const JSONFILE = "./mqttwled.json"
var client  = null; 
var configFile = {    
    "broker": "mqtt://broker.hivemq.com/",
    "topic": "XXXXX",
    "clientid": "XXXX"};

const nTransitionTimeSecs = 2;
const nDurationSecs = 60;

const sChristmasPresets = "[1,2,3,4,5,11]";
const sCommandersPresets = "[8]";
const sUNCPresets = "[9]";
const sUSAPresets = "[10]";
const sValentinesPresets = "[6,7]";
const sGeneralPresets = "[2,11]";


var oPresetsByMonth = [
sChristmasPresets  //jan
,sValentinesPresets //feb
,sUNCPresets //mar
,sGeneralPresets //apr
,sUSAPresets //may
,sGeneralPresets //Jun
,sUSAPresets //Jul
,sGeneralPresets //Aug
,sGeneralPresets //Sep
,sCommandersPresets //Oct
,sCommandersPresets //Nov
,sChristmasPresets //Dec
]

function getConfigFile(sFileLoc)
{
	//logger.debug('Getting Config File %s', sFileLoc);
	try 
	{
		const jsonString = fs.readFileSync(sFileLoc).toString();
		var oJSONOBJ = JSON.parse(jsonString);
		oJSONOBJ.updated=0;
		//logger.debug('Successfully loaded config file: %s', oJSONOBJ.length);
		return oJSONOBJ
	} 
	catch (err) 
	{
		//logger.error("The file '%s' does not exist or contains invalid arguments! Exiting...", sFileLoc);
		console.warn(err);
		process.exit(1);
	}
}

function generateRandomHex() {
  let hexCode = "";
  for (let i = 0; i < 6; i++) {
    hexCode += Math.floor(Math.random() * 16).toString(16);
  }
  return hexCode;
}

function randomColor()
{
    return '["'+generateRandomHex()+'","'+generateRandomHex()+'","'+generateRandomHex()+'"]';
}

function main()
{
    const nMonth = parseInt((new Date()).getMonth());
    configFile = getConfigFile(JSONFILE);
    try 
    {
        const mq_options = {clientId: configFile.clientid}
        client = mqtt.connect(configFile.broker, mq_options);

        client.on('connect', () => 
        {
            console.log('Connected to MQTT broker: ' + configFile.broker);

            var message = '{"playlist": {"ps": '+oPresetsByMonth[nMonth]+',"dur": '+(nDurationSecs*10)+', "transition":'+(nTransitionTimeSecs*10)+'  }}'
          
          
            client.publish(configFile.topic, message, { retain: true }, (err) => 
            {
                if (err) 
                {
                    console.error(('Failed to publish message:' + message), err);
                } 
                else 
                {
                    console.log('published message:' + message);
                    client.end();
                }
            });
        });

        client.on('offline', () => {
          console.log('Client is offline');
        });

        client.on('reconnect', () => {
          console.log('Reconnecting to MQTT broker');
        });

        client.on('end', () => { 
          console.log('Connection to MQTT broker ended');
        });
    } catch (error) 
    {
        console.error('Error:', error);
    }
}

main();
