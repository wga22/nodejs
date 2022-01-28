#!/usr/bin/env node
/*
* monitoring tool for checking availability, or certain specific values (such as update in past 24hrs)
*/


//libraries
const debuggerObj = require('debug');
const fs = require('fs');	//https://nodejs.org/api/fs.html

const axios = require('axios');	//https://github.com/axios/
const nodemailer = require("nodemailer");

//CONSTS
const JSONFILE = "./system_monitoring.json"
const NODEMAILER = "./nodemailer.json";
const MILLISPERDAY = 24*3600000;


//set DEBUG
const debug = debuggerObj('debug:*');
const info = debuggerObj('info:*');	//always show info
const error = debuggerObj('error:*');	//always show errors

//GLOBAL
var configFile = {params:{}, sites:[], updated:0};
var sEmailTo = "";
var recLastModified = null;

//MAIN
async function main()
{
	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	//debug = console.log.bind(console);
	var fs = require('fs');
	try 
	{
		var jsonString = fs.readFileSync(JSONFILE).toString();
		configFile = JSON.parse(jsonString);
		configFile.updated=0;
		//debug("-----Running-----");
	} 
	catch (err) 
	{
		error("The file '%s' does not exist or contains invalid arguments! Exiting...", JSONFILE);
		console.warn(err);
		process.exit(1);
	}
	monitorSystems();
	
	if(process.argv.length > 2 && process.argv[2])
	{
		sEmailTo = process.argv[2];
		debug('emailing %s', sEmailTo);
		waitForSitesThenRespond();
	}
}

waitForSitesThenRespond.counter = 60;
function waitForSitesThenRespond()
{
	//max timeout of "counter"
	if(waitForSitesThenRespond.counter>0 && configFile.updated != configFile.sites.length)
	{
		waitForSitesThenRespond.counter--;
		debug("waiting on sites %s (%s)", configFile.updated ,waitForSitesThenRespond.counter);
		setTimeout(waitForSitesThenRespond, 1000);
	}
	else	//move forward!
	{
		debug("done monitoring (%s)", configFile.updated);
		sendEmail();
		//TODO: rewrite JSON with new monitoring
	}
}


function sendEmail()
{
	//TODO: test for need to send email
	debug("Sending email %s", )
	if(true)
	{
		var aOutput = [];
		var aSites = configFile.sites;
		for(var x in aSites)
		{
			var oSite = aSites[x]
			if(oSite.success)
			{
				aOutput.push("Success: " + oSite.title + " was last seen " + yearDate(oSite.lastSeen));
			}
			else
			{
				aOutput.push("FAIL: " + oSite.title + " was last seen " + yearDate(oSite.lastSeen));
			}
		}
		debug("Sending email %s", aOutput.join('\n'));
		sendSystemErrorEmail(sEmailTo, aOutput.join('\n'));
	}
}

async function sendSystemErrorEmail(sTo, sErrorMessage) 
{
	var jsonString = fs.readFileSync(NODEMAILER).toString();
	var emailPropertiesFile = JSON.parse(jsonString);
  
  let transporter = nodemailer.createTransport({
	host: "smtp.office365.com",
	port: 587,
	requireTLS: true,
    auth: { user: emailPropertiesFile.user,  pass: emailPropertiesFile.pass  }
  });

  //send mail with defined transport object
  let inf = await transporter.sendMail({
    from: emailPropertiesFile.from, // sender address
    to: sTo, // list of receivers
    subject: configFile.params.subject, // Subject line
    text: sErrorMessage, // plain text body
    //html: sErrorMessage.replace('\n', "<br/>") // html body
  });

  info("Message sent: %s", inf.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  info("Preview URL: %s", nodemailer.getTestMessageUrl(inf));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}


function monitorSystems()
{
	var aSites = configFile.sites;
	for(var x in aSites)
	{
		//debug("site:" + debugconfig[x].title);
		switch(aSites[x].method)	//yes, wanted to do something more agile
		{
			case "ping":
				ping(aSites[x]);
				break;
			case "thingspeak":
				thingspeak(aSites[x]);
				break;
			case "parseEthmine":
				parseEthmine(aSites[x]);
				break;
            case "latestFileTest":
                confirmRecentFile(aSites[x]);
                break;
			default:
				ping(aSites[x]);
				break;
		}
	}
}

function ping(oSite)
{
	const sURL = oSite.url;
	debug("ping: " + sURL);
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

function parseEthmine(oSite)
{
	const wallet = oSite.wallet;
	var sURL = "https://api.ethermine.org/miner/"+wallet+"/workers"
	//https://api.ethermine.org/miner/0x4eb928xxxxxxxxxxxxxxx/workers
	/*
	{"status":"OK","data":[{"worker":"monster-lol","time":1611190800,"lastSeen":1611190721,"reportedHashrate":51693709,"currentHashrate":50000000,
	"validShares":45,"invalidShares":0,"staleShares":0,"averageHashrate":47200617.28395061}]}
	*/
	
	axios.get(sURL).then((response) => {
		var ethMineResp = response.data;
		debug("miner status: " + ethMineResp.status);
		if(ethMineResp.status == "OK" && ethMineResp.data && ethMineResp.data.length > 0 && ethMineResp.data[0].lastSeen)
		{
			var dLastSeen = new Date(ethMineResp.data[0].lastSeen*1000);	//1000X for millis
			debug("ethmine last running on %s", yearDate(dLastSeen));
			oSite.lastSeen = dLastSeen;
			if(withinDayOfNow(dLastSeen))
			{
				debug("good, system seems to have been running in past day");
				handleSuccess(oSite);
			}
		}
		else
		{
			//console.log("no miner??");
			handleFail(oSite);
		}
	}, 
	(error) => 
	{
		//issues loading page
		//console.log("issues loading URL: " + sURL);
		//console.log(error);
		handleFail(oSite);
	});
	
	
	
	//console.log("parseEthmine: " + sURL);
}

function thingspeak(oSite)
{
	/*
	{"channel":{"id":39741,"name":"1835Temperatures","description":"temperature and humidity of attic and other parts",
	"latitude":"0.0","longitude":"0.0","field1":"attic_temp",
	"field2":"attic_humidity",	"field3":"internet_temp","created_at":"2015-05-28T02:04:56Z","updated_at":"2018-08-17T08:16:08Z","last_entry_id":42038},
	"feeds":[{"created_at":"2021-01-21T00:10:42Z","entry_id":42038,"field1":"48.20000","field2":"41.00000","field3":"38.00000"}]}
	*/
	
	const sURL = oSite.url;
	axios.get(sURL).then((response) => {
		var thingSpData = response.data;
		if(thingSpData && thingSpData.feeds && thingSpData.feeds.length > 0 && thingSpData.feeds[0].created_at)
		{
			debug("tpoutput: %s", thingSpData.feeds[0].created_at);
			var lastDataDate = new Date(thingSpData.feeds[0].created_at);
			debug("last seen %s", yearDate(lastDataDate));
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
	}, 
	(error) => 
	{
		handleFail(oSite);
	});	
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
        debug("confirm dir: " + sPath);
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
	info("FAIL: " + oSite.title + "(%s)", (oSite.url ? oSite.url : ""));
	configFile.updated++;
	oSite.success = false;
	//TODO: check if fail is first time and system active, and email
	//TODO: rewrite config
}

function handleSuccess(oSite)
{
	const sURL = oSite.url;
	info("Success: %s", oSite.title);
	oSite.success = true;
	configFile.updated++;
	//TODO: check if success is first time, and write log
	//TODO: rewrite config	
}


/////////////////  HELPERS /////////////////////////////////////
function withinDayOfNow(dTime, nDays)
{
	var date = new Date();
    nDays = nDays ? nDays : 1;
	var nDiff = Math.abs(date.getTime() - dTime.getTime());
	//debug("The site was updated %s", yearDate(dTime));
	//debug(nDiff + " < " +  dTime.getTime());
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

main().catch(console.error);


/*
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

