#!/usr/bin/env node
/*
* monitoring tool for checking availability, or certain specific values (such as update in past 24hrs)
TODO: 
- incorportate system info from <SERVER>/systems.php
- OR system info from <SERVER>/nextcloud/ocs/v2.php/apps/serverinfo/api/v1/info
- get system access info <SERVER>/access.latest.htm
- check status of <SERVER>/temp.php
*/


//libraries
//TODO: introduce winston instead of debug
const { createLogger, format, transports } = require('winston');
const fs = require('fs');	//https://nodejs.org/api/fs.html

const axios = require('axios');	//https://github.com/axios/
const nodemailer = require("nodemailer");
const reEmailMatch =/^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

//CONSTS
//const JSONFILE = "./filework/system_monitoring.json"
const JSONFILE = "./test_system_monitoring.json"
const NODEMAILER = "./nodemailer.json";
const MILLISPERDAY = 24*3600000;


//set DEBUG
const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.splat(),
    format.simple()
  ),  //https://github.com/winstonjs/winston#formats
  //defaultMeta: { service: 'user-service' },
  transports: [new transports.Console() ],
});

//GLOBAL
var configFile = {params:{}, sites:[], updated:0};
var sEmailTo = "";
var recLastModified = null;

//MAIN
async function main()
{
	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	var fs = require('fs');
	configFile = getConfigFile(JSONFILE);

	await monitorSystems();
	
	const mailTo1 = ((configFile.params)?configFile.params.mailto : "" )
	const mailTo2 = (process.argv.length > 2 && process.argv[2] ? process.argv[2]: "");

	var sEmailAddr = getEmailAddress([mailTo1, mailTo2]);
	if(sEmailAddr)
	{
		logger.debug('emailing %s', sEmailAddr);
		await sendEmail(sEmailAddr);
	}
	if(true)
	{
		await rewriteConfigFile(JSONFILE, configFile);
	}
}

function getEmailAddress(aOptions)
{
	var sRes = null;
	if(aOptions && aOptions.length)
	{
		for(var x=0; x< aOptions.length; x++)
		{
			var sEmailTo = aOptions[x];
			if(null != sEmailTo.match(reEmailMatch))
			{
				logger.debug('emailing %s', sEmailTo);
				sRes = sEmailTo
				break;
			}
			else
			{
				logger.info("the argument %s is not a valid email address.  Not emailing", sEmailTo);
			}
		}
	}
	return sRes;
}

async function rewriteConfigFile(sFileLoc, oJSON)
{
	try 
	{
		var sJSONString = JSON.stringify(oJSON, null, 4);
		fs.writeFileSync(sFileLoc, sJSONString);
		logger.debug('Successfully Writing out Config File %s', sFileLoc);
	} 
	catch (err) 
	{
		logger.error("ERROR writing out the json file '%s'", sFileLoc);
		console.warn(err);
		//process.exit(1);
	}
}

function getConfigFile(sFileLoc)
{
	logger.debug('Getting Config File %s', sFileLoc);
	try 
	{
		const jsonString = fs.readFileSync(sFileLoc).toString();
		var oJSONOBJ = JSON.parse(jsonString);
		oJSONOBJ.updated=0;
		logger.debug('Successfully loaded config file: %s', oJSONOBJ.length);
		return oJSONOBJ
	} 
	catch (err) 
	{
		logger.error("The file '%s' does not exist or contains invalid arguments! Exiting...", sFileLoc);
		console.warn(err);
		process.exit(1);
	}

}

async function sendEmail(sEmailTo)
{
	if(true)    //placeholder for logic on when to send email, for now assume if email passed in
	{
		logger.debug("Sending email %s", sEmailTo)
		var aOutput = [];
		var aSites = configFile.sites;
		siteList: for(var x in aSites)
		{
			var oSite = aSites[x]
            if("N" == oSite.active)
            {
                logger.debug("skipping site: %s", oSite.title);
                continue siteList;
            }
            var successString = (oSite.success ? "Success: ": "FAIL") + oSite.title + " was last seen " + yearDate(oSite.lastSeen);
			logger.debug(successString);
            aOutput.push(successString);
		}
		await sendSystemErrorEmail(sEmailTo, aOutput.join('\n'));
	}
}

async function sendSystemErrorEmail(sTo, sMessageBody) 
{
    var jsonString = fs.readFileSync(NODEMAILER).toString();
    var emailPropertiesFile = JSON.parse(jsonString);
    logger.debug("sendSystemErrorEmail %s", sTo);
    let transporter = nodemailer.createTransport(
    {
        host: "smtp.mail.yahoo.com",
        port: 587,
        requireTLS: true,
        auth: { user: emailPropertiesFile.user,  pass: emailPropertiesFile.pass  }
    });

  //send mail with defined transport object
  let inf = await transporter.sendMail({
    from: emailPropertiesFile.from, // sender address
    to: sTo, // list of receivers
    subject: configFile.params.subject, // Subject line
    text: sMessageBody, // plain text body
    //html: sErrorMessage.replace('\n', "<br/>") // html body
  });

  logger.info("Message sent: %s", inf.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  logger.info("Preview URL: %s", nodemailer.getTestMessageUrl(inf));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}


async function monitorSystems()
{
	var aSites = configFile.sites;
	siteList: for(var x in aSites)
	{
		const oSite = aSites[x];
        if("N" == oSite.active)
        {
            logger.debug("skipping site: %s", oSite.title);
            continue siteList;
        }
		logger.debug("site: %s", oSite.title);
		switch(oSite.method)	//yes, wanted to do something more agile
		{
			case "ping":
				await ping(oSite);
				break;
			case "thingspeak":
				await thingspeak(oSite);
				break;
			case "parseEthmine":
				await parseEthmine(oSite);
				break;
            case "latestFileTest":
                await confirmRecentFile(oSite);
                break;
			case "publicip":
				await checkPublicIPAddressForChange(oSite);
				break;
			default:
				await ping(oSite);
				break;
		}
	}
}

async function checkPublicIPAddressForChange(oSite)
{
	var sCurrentIP = await getPublicIpAddress();
	if(sCurrentIP === oSite.publicip )
	{
		handleSuccess(oSite);
	}
	else
	{
		oSite.publicip = sCurrentIP;
		handleFail(oSite);
	}
}


function nextcloudStatus()
{
    //TODO: pull from this info on DB, diskspace, uptime, etc
    //https://willcloud.crabdance.com/nextcloud/ocs/v2.php/apps/serverinfo/api/v1/info
    //https://willcloud.crabdance.com/nextcloud/ocs/v2.php/apps/serverinfo/api/v1/info?format=json
    
}

async function ping(oSite)
{
	const sURL = oSite.url;
	logger.debug("ping: " + sURL);
	try
	{
		await axios.get(sURL);
		handleSuccess(oSite);
	}
	catch(err)
	{
		handleFail(oSite);
	}
}

async function parseEthmine(oSite)
{
	const wallet = oSite.wallet;
	var sURL = "https://api.ethermine.org/miner/"+wallet+"/workers"
	//https://api.ethermine.org/miner/0x4eb928xxxxxxxxxxxxxxx/workers
	/*
	{"status":"OK","data":[{"worker":"monster-lol","time":1611190800,"lastSeen":1611190721,"reportedHashrate":51693709,"currentHashrate":50000000,
	"validShares":45,"invalidShares":0,"staleShares":0,"averageHashrate":47200617.28395061}]}
	*/	
	try
	{
		var response = await axios.get(sURL);
		const ethMineResp = response.data;
		logger.debug("miner status: " + ethMineResp.status);
		if(ethMineResp && ethMineResp.status == "OK" && ethMineResp.data && ethMineResp.data.length > 0 && ethMineResp.data[0].lastSeen)
		{
			var dLastSeen = new Date(ethMineResp.data[0].lastSeen*1000);	//1000X for millis
			logger.debug("ethmine last running on %s", yearDate(dLastSeen));
			oSite.lastSeen = dLastSeen;
			if(withinDayOfNow(dLastSeen))
			{
				logger.debug("good, system seems to have been running in past day");
				handleSuccess(oSite);
			}
		}
	}
	catch(e)
	{
		handleFail(oSite);
		logger.error(e);
	}
}

async function thingspeak(oSite)
{
	/*
	{"channel":{"id":39741,"name":"1835Temperatures","description":"temperature and humidity of attic and other parts",
	"latitude":"0.0","longitude":"0.0","field1":"attic_temp",
	"field2":"attic_humidity",	"field3":"internet_temp","created_at":"2015-05-28T02:04:56Z","updated_at":"2018-08-17T08:16:08Z","last_entry_id":42038},
	"feeds":[{"created_at":"2021-01-21T00:10:42Z","entry_id":42038,"field1":"48.20000","field2":"41.00000","field3":"38.00000"}]}
	*/
	
	const sURL = oSite.url;
	try
	{
		const response = await axios.get(sURL);
		var thingSpData = response.data;
		if(thingSpData && thingSpData.feeds && thingSpData.feeds.length > 0 && thingSpData.feeds[0].created_at)
		{
			logger.debug("tpoutput: %s", thingSpData.feeds[0].created_at);
			var lastDataDate = new Date(thingSpData.feeds[0].created_at);
			logger.debug("last seen %s", yearDate(lastDataDate));
			oSite.lastSeen = lastDataDate;
			if(withinDayOfNow(lastDataDate))
			{
				handleSuccess(oSite);
			}
			else
			{
				handleFail(oSite);	
			}
		}
	}
	catch(e)
	{
		handleFail(oSite);
	}
}


function confirmRecentFile(oSite)
{
    const ACCEPTABLEFILEAGE=14;
    if(recLastModified == null)
    {
        try
        {
            recLastModified = require('recursive-last-modified');
        }
        catch(e)
        {
             //TODO
        }        
    }

    if(recLastModified!=null)
    {
        const sPath = oSite.url;
        logger.debug("confirm dir: " + sPath);
        var nDateStamp = recLastModified(sPath);
        
        if(nDateStamp)
        {
           var latestFileDate = new Date(nDateStamp);
           if(withinDayOfNow(latestFileDate ,ACCEPTABLEFILEAGE) )
           {
               oSite.message=("Good Date: " + latestFileDate.toDateString());
               handleSuccess(oSite);
           }
           else
           {
               //need to fix that it is failing, but showing wrong date
               oSite.message="File too old("+nDateStamp+"): " + latestFileDate.toDateString();
               handleFail(oSite);
           }
        }
        else
        {
            oSite.message="Date not found.  No file?";
            handleFail(oSite);
        }
    }
    else
    {
        oSite.message="recursive-last-modified not installed";
        handleFail(oSite);
    }    
}


function handleFail(oSite)
{
	logger.info("FAIL: " + oSite.title + "(%s)", (oSite.url ? oSite.url : ""));
	oSite.success = false;
}

function handleSuccess(oSite)
{
	oSite.lastSeen = new Date();
	oSite.success = true;
	logger.info("Success: %s", oSite.title);
}


/////////////////  HELPERS /////////////////////////////////////
function withinDayOfNow(dTime, nDays)
{
	var date = new Date();
    nDays = nDays ? nDays : 1;
	var nDiff = Math.abs(date.getTime() - dTime.getTime());
	//logger.debug("The site was updated %s", yearDate(dTime));
	//logger.debug(nDiff + " < " +  dTime.getTime());
	return nDiff <= (MILLISPERDAY*nDays);
}

function yearDate(a_dDate)
{
	if(a_dDate){} else {a_dDate = new Date()};		
	return ((1900+a_dDate.getYear()) + "-" + pad2(1+a_dDate.getMonth()) + "-"+ pad2(a_dDate.getDate()));
}

function pad2(nMin)
{
	return nMin < 10 ? ("0" +nMin) : nMin 
}

async function getPublicIpAddress() {
	try {
	  const response = await axios.get('https://ifconfig.me/ip');
	  return response.data.trim();
	} catch (error) {
	  console.error('Failed to fetch public IP:', error.message);
	  return null;
	}
  }


main().catch(console.error);
//main();


/*
--Check IP address
const axios = require('axios');
const fs = require('fs');

// File to store the last known public IP address
const ipFilePath = 'public_ip.txt';

// Function to fetch the current public IP address
async function getPublicIpAddress() {
  try {
    const response = await axios.get('https://ifconfig.me/ip');
    return response.data.trim();
  } catch (error) {
    console.error('Failed to fetch public IP:', error.message);
    return null;
  }
}

// Function to read the last known public IP address from a file
function readLastKnownIp() {
  try {
    return fs.readFileSync(ipFilePath, 'utf8').trim();
  } catch (error) {
    return null;
  }
}

// Function to save the current public IP address to a file
function savePublicIp(ipAddress) {
  try {
    fs.writeFileSync(ipFilePath, ipAddress);
    console.log(`Public IP address saved: ${ipAddress}`);
  } catch (error) {
    console.error('Failed to save public IP address:', error.message);
  }
}

// Function to check for IP address changes
async function checkIpChange() {
  const currentIp = await getPublicIpAddress();
  if (!currentIp) {
    return;
  }

  const lastKnownIp = readLastKnownIp();

  if (currentIp !== lastKnownIp) {
    console.log('Public IP address has changed:', currentIp);
    savePublicIp(currentIp);
  } else {
    console.log('Public IP address has not changed:', currentIp);
  }
}

// Run the IP check every minute (adjust the interval as needed)
setInterval(checkIpChange, 60000);

// Initial check on script startup
checkIpChange();



JUNK

		try
		{
			console.log(response.data);
			console.log("trying to parse");
			etherMineData = JSON.parse(response.data);
			console.log("miner status: " + etherMineData.status);
			if(etherMineData.status == "OK" && etherMineData.data && etherMineData.data.length > 0 && etherMineData.data[0].lastSeen)
			{
				var dLastSeen = new Date(etherMineData.data[0].lastSeen);
				console.log(yearDate(dLastSeen));
			}
			else
			{
				console.log("no miner??");
			}
			console.log(etherMineData.data[0].lastSeen);
		}
		catch(e)
		{
			console.warn(e);
			console.log("issue getting miner data");
		}

	axios.get(sURL).then((response) => {
	// Load the web page source code into a cheerio instance
	const $ = cheerio.load(response.data)

	// The pre.highlight.shell CSS selector matches all `pre` elements
	// that have both the `highlight` and `shell` class
	const urlElems = $('pre.highlight.shell')

	// We now loop through all the elements found
	for (let i = 0; i < urlElems.length; i++) {
	// Since the URL is within the span element, we can use the find method
	// To get all span elements with the `s1` class that are contained inside the
	// pre element. We select the first such element we find (since we have seen that the first span
	// element contains the URL)
	const urlSpan = $(urlElems[i]).find('span.s1')[0]

	// We proceed, only if the element exists
	if (urlSpan) {
	// We wrap the span in `$` to create another cheerio instance of only the span
	// and use the `text` method to get only the text (ignoring the HTML)
	// of the span element
	const urlText = $(urlSpan).text()

	// We then print the text on to the console
	console.log(urlText)
	}
	}
})
*/


/*
Sample file

[
{
	"title":"ethmine",
	"url":"https://ethermine.org/miners/xxxxxxxxxxxxxxxxxxxx/worker/monster-lol",
    "method": "parseEthmine",
	"monitoring" : "Y",
	"active" : "Y"
},
{
	"title":"plex",
	"url":"http://spiderman:32400/web",
    "method": "ping",
	"monitoring" : "Y",
	"active" : "Y"
},
{
	"title":"landscape",
	"url":"http://tlandscape12/",
    "method": "ping",
	"monitoring" : "Y",
	"active" : "Y"
},
{
	"title":"google",
	"url":"https://google.com",
    "method": "ping",
	"monitoring" : "Y",
	"active" : "Y"
},
{
	"title":"solar",
	"url":"https://api.thingspeak.com/channels/XXXXXX/feeds.json?results=1",
    "method": "thingspeak",
	"monitoring" : "Y",
	"active" : "Y"
},
{
	"title":"nc photos will",
	"url":"/var/www/nextcloud/data/will/files/InstantUpload/Camera",
    "method": "latestFileTest",
	"monitoring" : "Y",
	"active" : "Y"
},
{
	"title":"attic temps",
	"url":"https://api.thingspeak.com/channels/XXXXXX/feeds.json?results=1",
    "method": "thingspeak",
	"monitoring" : "Y",
	"active" : "Y"
}
]



*/