/*
        pulls data from thingspeak and pushes to DB.
        JSON file contains info on the db and TP structure
*/

const { createLogger, format, transports } = require('winston');
const fs = require('fs');
const axios = require('axios');
const { Client } = require('pg');

// CONSTS
const TPURL = "https://api.thingspeak.com/channels/";

// Logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.splat(),
    format.simple()
  ),
  transports: [new transports.Console()],
});

// GLOBALS
var dbclient = null;
var sJSONFileName = "./thingspeak_solar.json";
var nMaxExistingRow = -1;
var nInsertCount = 0;

var oTPDataStructure = {
        "database": {
                "user": "x",
                "host": "x",
                "database": "x",
                "password": "x",
                "port": 5432
        },
        "tp_channel": "x",
        "tp_read_key": "x",
        "tablename": "solar_panel",
        "pk_name": "tp_entry_id",
        "fields": [
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
};

async function loadConfig(a_sJSONFileName) {
        logger.info("USAGE: thingspeak_puller.js");
        try {
                var jsonString = fs.readFileSync(a_sJSONFileName).toString();
                oTPDataStructure = validateJSON(JSON.parse(jsonString), oTPDataStructure);
                logger.debug(JSON.stringify(oTPDataStructure));
        } catch (err) {
                logger.error("Error with processing arguments or JSON file %o", err);
                process.exit(1);
        }
}

function validateJSON(newObject, oValidObject) {
        for (var x in oValidObject) {
                if (!newObject[x]) {
                        var sErrorString = "ERROR: cannot find " + x;
                        logger.error(sErrorString);
                        throw new Error(sErrorString);
                }
        }
        return newObject;
}

async function main() {
        if (process.argv.length > 2 && process.argv[2] && fs.existsSync(process.argv[2])) {
                sJSONFileName = process.argv[2];
                logger.info('Pulling file from Arguments %s', sJSONFileName);
        } else {
                logger.info('Using default file %s', sJSONFileName);
        }

        await loadConfig(sJSONFileName);

        dbclient = new Client(oTPDataStructure["database"]);
        await dbclient.connect();

        try {
                nMaxExistingRow = await getDbLatestRow(oTPDataStructure["pk_name"]);
                logger.debug("latest row in TP %s", nMaxExistingRow);

                var oMonthToLoad = new Date();
                oMonthToLoad.setMonth(oMonthToLoad.getMonth() + 1);
                await pullTPDataintoDB(oMonthToLoad);

                await cleanUp();
        } catch (err) {
                logger.error("Error during ThingSpeak sync: %o", err);
                await dbclient.end();
                process.exit(22);
        }
        logger.debug("ending main");
}

async function getDbLatestRow(pk_name) {
        var sMaxValQuery = 'SELECT max(' + pk_name + ') as maxid from ' + oTPDataStructure["tablename"];
        logger.debug("max val query %s", sMaxValQuery);
        var res = await dbclient.query(sMaxValQuery);
        var nMaxID = (res.rows.length && parseInt(res.rows[0]["maxid"]) > 0) ? parseInt(res.rows[0]["maxid"]) : -1;
        logger.debug("max id from table is %s", nMaxID);
        return nMaxID;
}

async function pullTPDataintoDB(aoEndDate) {
        var sStopDate = getDateToTSStringFirstDay(aoEndDate);
        aoEndDate.setMonth(aoEndDate.getMonth() - 2);
        var sURL = TPURL + oTPDataStructure["tp_channel"]
                + "/feeds.json?timezone=America%2FNew_York&status=true&api_key="
                + oTPDataStructure["tp_read_key"]
                + "&start=" + getDateToTSStringFirstDay(aoEndDate)
                + "&end=" + sStopDate;
        logger.debug("TP URL: %s", sURL);

        const response = await axios.get(sURL);
        const thingSpData = response.data;
        let fStopRecursion = false;

        if (thingSpData && thingSpData.feeds && thingSpData.feeds.length > 0) {
                for (let y = 0; y < thingSpData.feeds.length; y++) {
                        if (thingSpData.feeds[y]["entry_id"] > nMaxExistingRow) {
                                logger.debug("Found entry %s in TP dataset.", thingSpData.feeds[y]["entry_id"]);
                                await insertTPData(thingSpData.feeds[y]);
                        } else {
                                logger.debug("Entry already in system: %s <= %s", thingSpData.feeds[y]["entry_id"], nMaxExistingRow);
                                fStopRecursion = true;
                        }
                }

                if (!fStopRecursion) {
                        logger.debug("Recursing to prior month window");
                        await pullTPDataintoDB(aoEndDate);
                } else {
                        logger.debug("Reached existing records, stopping recursion");
                }
        } else {
                logger.debug("ENDING: dataset as prior month has no records %s", sStopDate);
        }
}

async function insertTPData(aoTPRow) {
        var aFields = [];
        var aValues = [];
        for (var x = 0; x < oTPDataStructure["fields"].length; x++) {
                var oField = oTPDataStructure["fields"][x];
                aFields.push(oField["dbname"]);
                if ("timestamp" == oField["dbtype"] || "varchar" == oField["dbtype"]) {
                        aValues.push("'" + aoTPRow[oField["tp_field"]] + "'");
                } else {
                        var res = "null";
                        if ((aoTPRow[oField["tp_field"]]) || parseInt(aoTPRow[oField["tp_field"]]) == 0) {
                                res = 0;
                                if ("int" == oField["dbtype"]) {
                                        res = parseInt(aoTPRow[oField["tp_field"]]);
                                } else if (parseFloat(aoTPRow[oField["tp_field"]])) {
                                        res = parseFloat(aoTPRow[oField["tp_field"]]);
                                }
                        }
                        aValues.push(res);
                }
        }

        var sInsertStatement = "insert into " + oTPDataStructure["tablename"]
                + " (" + (aFields.join(",")) + ") values ("
                + aValues.join(",") + ")";
        nInsertCount++;
        logger.debug("insert (%s): %s", nInsertCount, sInsertStatement);
        return await dbclient.query(sInsertStatement);
}

async function runUpdates() {
        logger.debug("running updates");
        if (oTPDataStructure["updates"] && oTPDataStructure["updates"].length) {
                logger.debug("running updates %s", oTPDataStructure["updates"].length);
                for (var x = 0; x < oTPDataStructure["updates"].length; x++) {
                        var sUpdate = oTPDataStructure["updates"][x];
                        logger.debug("running cleanup query %s", sUpdate);
                        await dbclient.query(sUpdate);
                }
        }
}

async function cleanUp() {
        await runUpdates();
        logger.info("Processing completed, %s inserts processed", nInsertCount);
        await dbclient.end();
        logger.info("exiting cleanly, db connection closed");
}

function getDateToTSStringFirstDay(a_oDate) {
        if (!a_oDate) {
                a_oDate = new Date();
        }
        var sMonth = (a_oDate.getMonth() + 1);
        sMonth = (sMonth < 10) ? ("0" + sMonth) : (sMonth + "");
        return (a_oDate.getFullYear() + 0) + "-" + sMonth + "-01%2000:00:00";
}

main().catch(console.error);