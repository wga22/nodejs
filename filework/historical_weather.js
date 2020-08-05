#!/usr/bin/env node
const csv = require('csv-parser');
const fs = require('fs');

var filename = "C:\\Users\\Will\\Downloads\\72403093738.csv";
fs.createReadStream(filename)
  .pipe(csv())
  .on('data', (row) => {
    console.log("DATE: " + row.DATE + " REPORT_TYPE: " + row.REPORT_TYPE + " TMP: " + row.TMP+ " WND: " + row.WND+ " AA1: " + row.AA1+ " AE1: " + row.AE1);
  }) //13th field
  .on('end', () => {
    console.log('CSV file successfully processed');
  });