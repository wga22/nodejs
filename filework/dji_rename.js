#!/usr/bin/env node
const util = require('util');
const fs = require('fs');	//https://nodejs.org/api/fs.html
const httpClient = require('http');
const ExifImage = require('exif').ExifImage;	//https://github.com/gomfunkel/node-exif
//  http://maps.googleapis.com/maps/api/geocode/json?sensor=true&latlng=35.119909,-93.867188
//  http://maps.googleapis.com/maps/api/geocode/json?sensor=true&latlng=32.9764,11.0268
const geocodeURL = "http://maps.googleapis.com/maps/api/geocode/json?sensor=true&latlng=";
var photoPath = "D:/stuff/aireal\ photography/stills";

//MAIN
main();
function main()
{
	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	var fs = require('fs');
	var sNewName = randomString(5);
	if(process.argv.length > 2)
	{
		sNewName = process.argv[2];
		console.log('using filename ', sNewName);
	}
	try 
	{
		
		var aoFiles = getFilesToRename(photoPath, sNewName);
		
	} catch (err) {
		console.warn("Error Exiting..." + err);
		process.exit(1);
	}
	//listFilesToMove();	
}
//http://maps.googleapis.com/maps/api/geocode/json?latlng=35.119909,-93.867188&sensor=true

function getFilesToRename(sPath, sNewName)
{
	var aFiles = fs.readdirSync(sPath);
	var aoFiles = [];	//array of objects with more details
	//var aDJIFiles = aFiles.filter(function(val){return val.match(/DJI_\d+(\ \(\d+\))?\.JPG/i)});
	var aDJIFiles = aFiles.filter(function(val){return val.match(/DJI_\d+?\.JPG/i)});
	for(var x in aDJIFiles)
	{
		//loadExifData(sPath + '/'  + aDJIFiles[x])
		
		//fs.stat((sPath + '/'  + aDJIFiles[x]), renameFile, sNewName); 
		//fs.stat((sPath + '/'  + aDJIFiles[x]), renameFile); 
		//console.log("found!" + aDJIFiles[x])
		renameFile(sPath + '/'  + aDJIFiles[x], sNewName)
	}
}
 
function renameFile(sFile, sNewName)
{
	
	try
	{
		var stats = fs.statSync(sFile);
		var sFileTime = yearDate(stats.ctime);
		//console.log(sFileTime)
		var sUpdatedFileName = sFile.replace(/DJI_(\d+)\.JPG/, (sNewName+"_"+sFileTime+'_$1.jpg'))
		console.log("old: ", sFile, " new: " , sUpdatedFileName);
		//fs.rename(sFile,sUpdatedFileName, function(){console.log("renamed: " + sFile )});
	}
	catch(e)
	{
		console.warn("failed to rename " +sFile + " to " +  sUpdatedFileName + "(" + e.desc + ")")
	}
	
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

function loadExifData(sImage)
{
	try 
	{
		new ExifImage({ image : sImage }, processExifData, sImage);
	} 
	catch (error) 
	{
		console.log('Error: ' + error.message);
	}	
}

function processExifData(error, exifData, sImagePath)
{
	if (error)
	{
		console.log('Error: '+error.message);
	}
	else
	{
		//console.log(exifData.gps)
		var oRes = {lat: exifData.gps.GPSLatitude[2], lng: exifData.gps.GPSLongitude[2], sImage:sImagePath}
		console.log("image:"+oRes.sImage + " lat: " +oRes.lat+ " long: " + oRes.lng);
		//console.log()
		//TODO: nevermind, looks like lat/lng is munged
		loadCity(oRes)
	}
}

function loadCity(oProps)
{
	var sURL = (geocodeURL + oProps.lat+","+oProps.lng);
	console.log(sURL)
	//loadURLasJSON(sURL, renameImage, oProps);
}

function renameImage(oCityInfo, oProps)
{
	if(oCityInfo && oCityInfo.results)
	{
		console.log(oCityInfo.results[0].formatted_address)	
	}
	
}

function loadURLasJSON(sURL, funcCallback)
{
	httpClient.get(sURL, function(res)
	{
		var body = '';
		res.on('data', function(chunk){body += chunk;});
		res.on('end', function()
		{
			var oObj = {};
			try
			{
				oObj = JSON.parse(body);				
			}
			catch(e) {console.log("Something unexpected with the response from " + sURL);}
			//console.log("Got a response: ");
			funcCallback(oObj);
		});
	}).on('error', function(e){
		  console.log("Got an error: ", e);
	});
}

function randomString(nLen) 
{
	nLen = parseInt(nLen) ? parseInt(nLen) : 5;
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for (var i = 0; i < nLen; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}

/*
{
   "results" : [
      {
         "address_components" : [
            {
               "long_name" : "538",
               "short_name" : "538",
               "types" : [ "street_number" ]
            },
            {
               "long_name" : "Harlon Ryan Road",
               "short_name" : "Harlon Ryan Rd",
               "types" : [ "route" ]
            },
            {
               "long_name" : "Booneville",
               "short_name" : "Booneville",
               "types" : [ "locality", "political" ]
            },
            {
               "long_name" : "Sugar Creek Township",
               "short_name" : "Sugar Creek Township",
               "types" : [ "administrative_area_level_3", "political" ]
            },
            {
               "long_name" : "Logan County",
               "short_name" : "Logan County",
               "types" : [ "administrative_area_level_2", "political" ]
            },
            {
               "long_name" : "Arkansas",
               "short_name" : "AR",
               "types" : [ "administrative_area_level_1", "political" ]
            },
            {
               "long_name" : "United States",
               "short_name" : "US",
               "types" : [ "country", "political" ]
            },
            {
               "long_name" : "72927",
               "short_name" : "72927",
               "types" : [ "postal_code" ]
            },
            {
               "long_name" : "6608",
               "short_name" : "6608",
               "types" : [ "postal_code_suffix" ]
            }
         ],
         "formatted_address" : "538 Harlon Ryan Rd, Booneville, AR 72927, USA",
         "geometry" : {
            "location" : {
               "lat" : 35.118092,
               "lng" : -93.866642
            },
            "location_type" : "ROOFTOP",
            "viewport" : {
               "northeast" : {
                  "lat" : 35.11944098029149,
                  "lng" : -93.8652930197085
               },
               "southwest" : {
                  "lat" : 35.1167430197085,
                  "lng" : -93.86799098029151
               }
            }
         },
         "place_id" : "ChIJXaIKyVd4y4cRv2x4MQQHuwg",
         "types" : [ "street_address" ]
      },
      {
         "address_components" : [
            {
               "long_name" : "Sugar Creek Township",
               "short_name" : "Sugar Creek Township",
               "types" : [ "administrative_area_level_3", "political" ]
            },
            {
               "long_name" : "Logan County",
               "short_name" : "Logan County",
               "types" : [ "administrative_area_level_2", "political" ]
            },
            {
               "long_name" : "Arkansas",
               "short_name" : "AR",
               "types" : [ "administrative_area_level_1", "political" ]
            },
            {
               "long_name" : "United States",
               "short_name" : "US",
               "types" : [ "country", "political" ]
            },
            {
               "long_name" : "72927",
               "short_name" : "72927",
               "types" : [ "postal_code" ]
            }
         ],
         "formatted_address" : "Sugar Creek Township, AR 72927, USA",
         "geometry" : {
            "bounds" : {
               "northeast" : {
                  "lat" : 35.1371169,
                  "lng" : -93.8101661
               },
               "southwest" : {
                  "lat" : 35.0207641,
                  "lng" : -93.92541399999999
               }
            },
            "location" : {
               "lat" : 35.08812,
               "lng" : -93.8451731
            },
            "location_type" : "APPROXIMATE",
            "viewport" : {
               "northeast" : {
                  "lat" : 35.1371169,
                  "lng" : -93.8101661
               },
               "southwest" : {
                  "lat" : 35.0207641,
                  "lng" : -93.92541399999999
               }
            }
         },
         "place_id" : "ChIJM_5F14J5y4cRYuNnc2c4Jxs",
         "types" : [ "administrative_area_level_3", "political" ]
      },
      {
         "address_components" : [
            {
               "long_name" : "72927",
               "short_name" : "72927",
               "types" : [ "postal_code" ]
            },
            {
               "long_name" : "Booneville",
               "short_name" : "Booneville",
               "types" : [ "locality", "political" ]
            },
            {
               "long_name" : "Arkansas",
               "short_name" : "AR",
               "types" : [ "administrative_area_level_1", "political" ]
            },
            {
               "long_name" : "United States",
               "short_name" : "US",
               "types" : [ "country", "political" ]
            }
         ],
         "formatted_address" : "Booneville, AR 72927, USA",
         "geometry" : {
            "bounds" : {
               "northeast" : {
                  "lat" : 35.316457,
                  "lng" : -93.66116289999999
               },
               "southwest" : {
                  "lat" : 34.9472299,
                  "lng" : -94.230564
               }
            },
            "location" : {
               "lat" : 35.1068343,
               "lng" : -93.9470396
            },
            "location_type" : "APPROXIMATE",
            "viewport" : {
               "northeast" : {
                  "lat" : 35.2311509,
                  "lng" : -93.66116289999999
               },
               "southwest" : {
                  "lat" : 34.9472299,
                  "lng" : -94.230564
               }
            }
         },
         "place_id" : "ChIJQX8os-J2y4cRkl-5h91QO54",
         "types" : [ "postal_code" ]
      },
      {
         "address_components" : [
            {
               "long_name" : "Logan County",
               "short_name" : "Logan County",
               "types" : [ "administrative_area_level_2", "political" ]
            },
            {
               "long_name" : "Arkansas",
               "short_name" : "AR",
               "types" : [ "administrative_area_level_1", "political" ]
            },
            {
               "long_name" : "United States",
               "short_name" : "US",
               "types" : [ "country", "political" ]
            }
         ],
         "formatted_address" : "Logan County, AR, USA",
         "geometry" : {
            "bounds" : {
               "northeast" : {
                  "lat" : 35.430011,
                  "lng" : -93.2782929
               },
               "southwest" : {
                  "lat" : 35.0197151,
                  "lng" : -94.141835
               }
            },
            "location" : {
               "lat" : 35.2475011,
               "lng" : -93.66232389999999
            },
            "location_type" : "APPROXIMATE",
            "viewport" : {
               "northeast" : {
                  "lat" : 35.430011,
                  "lng" : -93.2782929
               },
               "southwest" : {
                  "lat" : 35.0197151,
                  "lng" : -94.141835
               }
            }
         },
         "place_id" : "ChIJ0xQhmdt3zIcRz5ow_Mzo_Ug",
         "types" : [ "administrative_area_level_2", "political" ]
      },
      {
         "address_components" : [
            {
               "long_name" : "Arkansas",
               "short_name" : "AR",
               "types" : [ "administrative_area_level_1", "political" ]
            },
            {
               "long_name" : "United States",
               "short_name" : "US",
               "types" : [ "country", "political" ]
            }
         ],
         "formatted_address" : "Arkansas, USA",
         "geometry" : {
            "bounds" : {
               "northeast" : {
                  "lat" : 36.4997491,
                  "lng" : -89.64483790000001
               },
               "southwest" : {
                  "lat" : 33.0041059,
                  "lng" : -94.61791900000001
               }
            },
            "location" : {
               "lat" : 35.20105,
               "lng" : -91.83183339999999
            },
            "location_type" : "APPROXIMATE",
            "viewport" : {
               "northeast" : {
                  "lat" : 36.4997491,
                  "lng" : -89.64483790000001
               },
               "southwest" : {
                  "lat" : 33.0041059,
                  "lng" : -94.61791900000001
               }
            }
         },
         "place_id" : "ChIJYSc_dD-e0ocR0NLf_z5pBaQ",
         "types" : [ "administrative_area_level_1", "political" ]
      },
      {
         "address_components" : [
            {
               "long_name" : "United States",
               "short_name" : "US",
               "types" : [ "country", "political" ]
            }
         ],
         "formatted_address" : "United States",
         "geometry" : {
            "bounds" : {
               "northeast" : {
                  "lat" : 71.5388001,
                  "lng" : -66.885417
               },
               "southwest" : {
                  "lat" : 18.7763,
                  "lng" : 170.5957
               }
            },
            "location" : {
               "lat" : 37.09024,
               "lng" : -95.712891
            },
            "location_type" : "APPROXIMATE",
            "viewport" : {
               "northeast" : {
                  "lat" : 49.38,
                  "lng" : -66.94
               },
               "southwest" : {
                  "lat" : 25.82,
                  "lng" : -124.39
               }
            }
         },
         "place_id" : "ChIJCzYy5IS16lQRQrfeQ5K5Oxw",
         "types" : [ "country", "political" ]
      }
   ],
   "status" : "OK"
}



{ image:
   { ImageDescription: 'DCIM\\100MEDIA\\DJI_0008.JPG',
     Make: 'DJI\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
     Model: 'FC220\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
     Orientation: 1,
     XResolution: 72,
     YResolution: 72,
     ResolutionUnit: 2,
     Software: 'v02.02.5629\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
     ModifyDate: '2017:08:25 17:51:23',
     YCbCrPositioning: 1,
     ExifOffset: 182,
     GPSInfo: 686,
     XPComment:
      [ 48,
        0,
        46,
        0,
        57,
        0,
        46,
        0,
        49,
        0,
        52,
        0,
        50,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        ... 28 more items ],
     XPKeywords: [ 78, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] },
  thumbnail:
   { Compression: 6,
     XResolution: 72,
     YResolution: 72,
     ResolutionUnit: 2,
     ThumbnailOffset: 41972,
     ThumbnailLength: 5947 },
  exif:
   { ExposureTime: 0.0029,
     FNumber: 2.2,
     ExposureProgram: 2,
     ISO: 100,
     ExifVersion: <Buffer 30 32 33 30>,
     DateTimeOriginal: '2017:08:25 17:51:23',
     CreateDate: '2017:08:25 17:51:23',
     ComponentsConfiguration: <Buffer 00 03 02 01>,
     CompressedBitsPerPixel: 2.652872,
     ShutterSpeedValue: 8.429,
     ApertureValue: 2.27,
     ExposureCompensation: 1,
     MaxApertureValue: 2.27,
     SubjectDistance: 0,
     MeteringMode: 2,
     LightSource: 0,
     Flash: 32,
     FocalLength: 4.7,
     MakerNote: <Buffer 0d 00 01 00 02 00 04 00 00 00 44 4a 49 00 02 00 01 00 04 00 00 00 01 02 00 00 03 00 0b 00 01 00 00 00 00 00 00 00 04 00 0b 00 01 00 00 00 00 00 00 00 ... >,
     FlashpixVersion: <Buffer 30 30 31 30>,
     ColorSpace: 1,
     ExifImageWidth: 4000,
     ExifImageHeight: 2250,
     InteropOffset: 656,
     ExposureIndex: NaN,
     FileSource: <Buffer 03>,
     SceneType: <Buffer 00>,
     CustomRendered: 0,
     ExposureMode: 0,
     WhiteBalance: 0,
     DigitalZoomRatio: NaN,
     FocalLengthIn35mmFormat: 26,
     SceneCaptureType: 0,
     GainControl: 0,
     Contrast: 0,
     Saturation: 0,
     Sharpness: 0,
     DeviceSettingDescription: <Buffer 00 00 00 00>,
     SubjectDistanceRange: 0 },
  gps:
   { GPSVersionID: [ 3, 2, 0, 0 ],
     GPSLatitudeRef: 'N',
     GPSLatitude: [ 38, 55, 51.7284 ],
     GPSLongitudeRef: 'W',
     GPSLongitude: [ 74, 55, 28.2818 ],
     GPSAltitudeRef: 1,
     GPSAltitude: 51.856 },
  interoperability: { InteropIndex: 'R98', InteropVersion: <Buffer 30 31 30 30> },
  makernote: { error: 'Unable to extract Makernote information as it is in an unsupported or unrecognized format.' } }
  */



/*
NOTES: 

  var Client = require('ftp');
  var fs = require('fs');

  var c = new Client();
  c.on('ready', function() {
    c.put('foo.txt', 'foo.remote-copy.txt', function(err) {
      if (err) throw err;
      c.end();
    });
  });
  // connect to localhost:21 as anonymous
  c.connect();
*/

