"use strict";
const nodemailer = require("nodemailer");
const fs = require('fs');	//https://nodejs.org/api/fs.html
const NODEMAILER = "./nodemailer.json";

// async..await is not allowed in global scope, must use a wrapper
async function main() 
{
	HALT();	//keep from oversending emails
	var jsonString = fs.readFileSync(NODEMAILER).toString();
	var configFile = JSON.parse(jsonString);
  
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  //let testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
	host: "smtp.office365.com",
	port: 587,
	requireTLS: true,
	//ignoreTLS: true,
	//secure: true,
    auth: {
      user: configFile.user, 
      pass: configFile.pass
    }
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: configFile.from, // sender address
    to: "will.allen@gmail.com", // list of receivers
    subject: "this is a good note", // Subject line
    text: "ok here we go", // plain text body
    html: "ok here we go" // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

main().catch(console.error);

/*
--yahoo--
Server - smtp.mail.yahoo.com
Port - 465 or 587
Requires SSL - Yes
Requires TLS - Yes (if available)
Requires authentication - Yes


---msft----
outlook_e2b70f89eaa99fe2@outlook.com
Server name: smtp.office365.com
Port: 587
Encryption method: STARTTLS

  code: 'EAUTH',
  response: '535 5.7.0 (#AUTH005) Too many bad auth attempts.',
  responseCode: 535,
  command: 'AUTH PLAIN'
  
  */