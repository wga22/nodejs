/*
	pulls data from thingspeak and pushes to DB.
	JSON file contains info on the db and TP structure
*/

const debuggerObj = require('debug');
const fs = require('fs');	//https://nodejs.org/api/fs.html
//const ThingSpeakClient = require('thingspeakclient');	//npm install -g thingspeakclient	//https://www.npmjs.com/package/thingspeakclient
const axios = require('axios');	//https://github.com/axios/
const { Client } = require('pg'); //npm install -g pg	//https://www.npmjs.com/package/pg

//CONSTS
const MILLISPERDAY = 24*3600000;
const TPURL = "https://api.thingspeak.com/channels/";

//set DEBUG
const debug = debuggerObj('debug:*');
const info = debuggerObj('info:*');	//always show info
const errorLogger = debuggerObj('error:*');	//always show errors

//GLOBALS
var dbclient = null;
var sJSONFileName = "./thingspeak_solar.json"
var nMaxExistingRow = -1;
var nInsertCount =0;

//initiate with sample structure and values
var oTPDataStructure = 
{
	"database":
	{
		"user": "x",
		"host": "x",
		"database": "x",
		"password": "x",
		"port": 5432,
	//UNUSED	"cert": "/etc/ssl/certs/ssl-cert-snakeoil.pem",
	//UNUSED	"file":"/etc/ssl/private/ssl-cert-snakeoil.key"
	},
	"tp_channel":"x",
	"tp_read_key": "x",
	//UNUSED "tp_write_key": "x",
	"tablename": "solar_panel",
	"pk_name": "tp_entry_id",
	"fields":
	[
		{"dbname":"created_at", "dbtype":"timestamp", "tp_field":"created_at"},
		{"dbname":"tp_entry_id", "dbtype":"int", "tp_field":"entry_id"},
		{"dbname":"batt_volt", "dbtype":"int", "tp_field":"field1"},
		{"dbname":"batt_current", "dbtype":"int", "tp_field":"field2"},
		{"dbname":"panel_volt", "dbtype":"int", "tp_field":"field3"},
		{"dbname":"lifetime_power", "dbtype":"int", "tp_field":"field4"},
		{"dbname":"charge_state", "dbtype":"int", "tp_field":"field5"},
		{"dbname":"load_current", "dbtype":"int", "tp_field":"field6"},
		{"dbname":"daily_yield", "dbtype":"int", "tp_field":"field7"},
		{"dbname":"daily_max_power", "dbtype":"int", "tp_field":"field8"}
	]
}


async function loadConfig(a_sJSONFileName)
{
	console.log("USAGE: thingspeak_puller.js");
	try 
	{
		var jsonString = fs.readFileSync(a_sJSONFileName).toString();
		oTPDataStructure = validateJSON(JSON.parse(jsonString), oTPDataStructure);
		debug(oTPDataStructure);
	} 
	catch (err)
	{
		errorLogger("Error with processing arguments or JSON file ");
		errorLogger(err);
		process.exit(1);
	}
}

function validateJSON(newObject, oValidObject)
{
	for(var x in oValidObject)
	{
		if(newObject[x])	//test for existance 
		{
			//debug("good, found %s", x);
		}
		else
		{
			var sErrorString = "ERROR: cannot find " + x;
			errorLogger(sErrorString);
			throw (new Error(sErrorString));
		}
	}
	return newObject;
	
}

async function main()
{
	//JSON file: figure out which json file to use
	if(process.argv.length > 2 && process.argv[2] && fs.existsSync(process.argv[2]))
	{
		sJSONFileName = process.argv[2];
		info('Pulling file from Arguments %s', sJSONFileName);
	}
	else
	{
		info('Using default file %s', sJSONFileName);
	}
	await loadConfig(sJSONFileName);
	
	//DB connection	
	dbclient = new Client(oTPDataStructure["database"]);
	await dbclient.connect();
	nMaxExistingRow = await getDbLatestRow(oTPDataStructure["pk_name"]);
	debug("latest row in TP %s", nMaxExistingRow);
	var oMonthToLoad = new Date();
	oMonthToLoad.setMonth(oMonthToLoad.getMonth()+1);	//increment the date one month forward for end date	
	await pullTPDataintoDB(oMonthToLoad);	//kick off recursion
	debug("ending main");
}

async function getDbLatestRow(pk_name)
{
	//const res = await dbclient.query('SELECT $1::text as message', ['Hello world!'])
	var sMaxValQuery = 'SELECT max('+pk_name+') as maxid from ' + oTPDataStructure["tablename"] ;
	debug("max val query %s", sMaxValQuery);
	var res = await dbclient.query(sMaxValQuery);
	var nMaxID = (res.rows.length && parseInt(res.rows[0]["maxid"])>0)  ? parseInt(res.rows[0]["maxid"]) : -1;
	debug("max id from table is %s", nMaxID);
	return nMaxID;
}

// load TP data
async function pullTPDataintoDB(aoEndDate)
{
	/*
	INSERT INTO tesla.solar_panel
	(tp_entry_id, created_at, batt_volt, batt_current, panel_volt, lifetime_power, charge_state, load_current, daily_yield, daily_max_power)
	VALUES(0, now(), 0, 0, 0, 0, 0, 0, 0, 0);
	var tpclient = new ThingSpeakClient();
	//client.attachChannel(channelId, { writeKey:'yourWriteKey', readKey:'yourReadKey'}, callBack);
	client.attachChannel(oTPDataStructure["tp_channel"], { readKey:oTPDataStructure["tp_read_key"]}, startLoadingData);
	
			for(var x=0; x < NMONTHSTOLOAD; x++)
		{
			//  start (datetime) Start date in format YYYY-MM-DD%20HH:NN:SS (optional) (stop is the same)
			var sStopDate = getDateToTSStringFirstDay(oMonthToLoad);
			oMonthToLoad.setMonth(oMonthToLoad.getMonth()-1)
			var sTPURLbyDate =  sTPURL+ "&start=" + getDateToTSStringFirstDay(oMonthToLoad) + "&end=" + sStopDate;
			//$('#debug').append("<li>"+sTPURLbyDate+"</li>");
			
			var sTPURL = 'https://api.thingspeak.com/channels/'+channel_id+'/feeds.json?timezone=America%2FNew_York&status=true&api_key=' + api_key;
	
	
	
	*/
	var sStopDate = getDateToTSStringFirstDay(aoEndDate);	//it'll start off as 1 month in future
	aoEndDate.setMonth(aoEndDate.getMonth()-2);
	var sURL = TPURL + oTPDataStructure["tp_channel"] 
		+ "/feeds.json?timezone=America%2FNew_York&status=true&api_key=" 
		+ oTPDataStructure["tp_read_key"]
		+ "&start=" + getDateToTSStringFirstDay(aoEndDate)
		+ "&end=" + sStopDate;
	debug("TP URL: %s", sURL);
	axios.get(sURL).then((response) => {
	var thingSpData = response.data;
	var fStopRecursion = false;
	if(thingSpData && thingSpData.feeds && thingSpData.feeds.length > 0)
	{
		for(var y=0; y < thingSpData.feeds.length; y++)
		{
			if(thingSpData.feeds[y]["entry_id"] > nMaxExistingRow)
			{
				debug("Found entry %s in TP dataset.", thingSpData.feeds[y]["entry_id"]);
				insertTPData(thingSpData.feeds[y]);	
			}
			else	//we've reached top of the existing data set
			{
				debug("Entry already in system: %s <= %s",thingSpData.feeds[y]["entry_id"], nMaxExistingRow );
				fStopRecursion = true;	//dont bother loading older months
			}
		}
		//TODO: do we trust this?
		if(!fStopRecursion)
		{
			debug("fStopRecursion");
			pullTPDataintoDB(aoEndDate);	//recursion for pros!
			//return pullTPDataintoDB(aoEndDate);	//recursion for pros!
		}
		else
		{
			debug("leaving");
			cleanUp();
			//return 1;
		}
	}
	else	//no new records found
	{
		debug("ENDING: dataset as prior month has no records %s", sStopDate);
		cleanUp();
		//return 1;
	}
	}, 
	(error) => 
	{
		cleanUp();
		errorLogger(error)
		process.exit(22);
	});
	debug("ending pullTPDataintoDB");
}

async function insertTPData(aoTPRow)
{
	/*
	INSERT INTO tesla.solar_panel
(tp_entry_id, created_at, batt_volt, batt_current, panel_volt, lifetime_power, charge_state, load_current, daily_yield, daily_max_power)
VALUES(0, now(), 0, 0, 0, 0, 0, 0, 0, 0);

	"fields":
	[
		{"dbname":"created_at", "dbtype":"timestamp", "tp_field":"created_at"},
		{"dbname":"tp_entry_id", "dbtype":"int", "tp_field":"entry_id"},
		{"dbname":"batt_volt", "dbtype":"int", "tp_field":"field1"},
		{"dbname":"batt_current", "dbtype":"int", "tp_field":"field2"},
		{"dbname":"panel_volt", "dbtype":"int", "tp_field":"field3"},
		{"dbname":"lifetime_power", "dbtype":"int", "tp_field":"field4"},
		{"dbname":"charge_state", "dbtype":"int", "tp_field":"field5"},
		{"dbname":"load_current", "dbtype":"int", "tp_field":"field6"},
		{"dbname":"daily_yield", "dbtype":"int", "tp_field":"field7"},
		{"dbname":"daily_max_power", "dbtype":"int", "tp_field":"field8"}
	]

*/
	
	var aFields = [];
	var aValues = [];
	for(var x=0; x < oTPDataStructure["fields"].length; x++)
	{
		var oField = oTPDataStructure["fields"][x];
		aFields.push(oField["dbname"]);
		if("timestamp" == oField["dbtype"] || "varchar" == oField["dbtype"])
		{
			aValues.push("'" + aoTPRow[oField["tp_field"]] + "'");
		}
		else
		{
			var res = "null";	//default to null
			if((aoTPRow[oField["tp_field"]]) || parseInt(aoTPRow[oField["tp_field"]])==0 )
			{
				res = 0; //handle 0
				if("int" == oField["dbtype"])
				{
					res = parseInt(aoTPRow[oField["tp_field"]]);
				}
				else if(parseFloat(aoTPRow[oField["tp_field"]]))
				{
					res = parseFloat(aoTPRow[oField["tp_field"]])
				}
			}
			aValues.push(res);
		}	
	}
	
	var sInsertStatement = "insert into " + oTPDataStructure["tablename"] 
		+ " (" +  (aFields.join(",")) + ") values (" +
		aValues.join(",") + ")";
	nInsertCount++;
	debug("insert (%s): %s", nInsertCount, sInsertStatement);
	//TODO look at batching the inserts
	return res = await dbclient.query(sInsertStatement);
}

async function runUpdates()
{
	debug("running updates");
	if(oTPDataStructure["updates"] && oTPDataStructure["updates"].length)
	{
		debug("running updates %s", oTPDataStructure["updates"].length);
		for(var x=0; x <oTPDataStructure["updates"].length; x++ )
		{
			var sUpdate = oTPDataStructure["updates"][x];
			debug("running cleanup query %s" , sUpdate);
			await dbclient.query(sUpdate);
		}
	}	
}


async function cleanUp()
{
	await runUpdates();
	info("Processing completed, doing commit for %s inserts", nInsertCount);
	dbclient.query('COMMIT', err => {
          if (err) 
		  {
            errorLogger('Error committing transaction', err.stack)
			dbclient.end();
			process.exit(3);
          }
		dbclient.end();
		info("exiting cleanly, db connection closed");
		process.exit(0);
        });
}

function getDateToTSStringFirstDay(a_oDate)
{
	//YYYY-MM-DD%20HH:NN:SS
	if(!a_oDate)
	{
		a_oDate = new Date();
	}
	var sMonth = (a_oDate.getMonth() + 1);
	sMonth = (sMonth < 10)? ("0"+sMonth) : (sMonth + "");
	return (a_oDate.getFullYear()+0) + "-" + sMonth + "-01%2000:00:00"
}

function updateJSONFile()	
{
	//TODO - do we need this?  need ot know last entry written, so maybe use DB instead?
	// fs.writeFileSync(JSONFILE, oTPDataStructure);
}

/////////////////////////  MAIN		///////////////////////////////
main().catch(console.error);
/////////////////////////  MAIN		///////////////////////////////