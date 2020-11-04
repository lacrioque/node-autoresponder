const imaps = require('imap-simple');
const mailer = require("nodemailer");
// const readline = require('readline');
const promisify = require('util').promisify;

const noSelfTest = process.argv.includes("test:none");
const CONFIG = require("./config.inc.json");
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });


const simpleParser = require('mailparser').simpleParser;
const _ = require('lodash');



const triggerResponseEmail = async function (address, addressName = "Bewegungsfan", test=false) {

    const mailText = require("./responseEmail.text");
    const textToSend = mailText.replace(/\{name\}/, addressName);

    let transporter = mailer.createTransport(CONFIG.SMTP);
    try {
        let sendMail = await transporter.sendMail({
            from: "Flexxpoint Zoombot <join@flexxpoint.org>",
            to: address,
            subject: "[FLEXXPOINT-ZOOM-KURS] Wir freuen uns, das du mitmachen willst!",
            text: textToSend,
            replyTo: "noreply@flexxpoint.org"
        });
        console.log("Message sent: %s", sendMail.messageId);
        transporter.close();
        return true;
    } catch(err) {
        if(test===true) {
            console.log(err); 
            return false; 
        }
        console.error(err);
        console.error("Error sending messages. Exiting.");
        process.exit(105);
    }
};

const getMailsProcess = async function (test = false) {
    let connection;
    try {
        connection= await imaps.connect(CONFIG.IMAP);
    } catch(e) {
        console.log("Error connecting to Server");
    }
    await connection.openBox('INBOX')
    const searchCriteria = ['ALL'];
    const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        struct: true
    };
    try {
        const messages = await connection.search(searchCriteria, fetchOptions);
        if(test===true) { return true; }
        await messages.reduce(async function (deferred, item) {
            await deferred;
            return new Promise((resolve) => {
                const all = _.find(item.parts, { "which": "" })
                const id = item.attributes.uid;
                const idHeader = "Imap-Id: " + id + "\r\n";
        
                simpleParser(idHeader + all.body, async (err, mail) => {
                    const {address, name} = mail.from.value[0]
                    console.log(`###
Responding directly on email with
Subject "${mail.subject}", from "${address} (${name})"
###`);
                    try {
                        await connection.addFlags(item.attributes.uid, "\Deleted");
                        console.log(`Message marked for deletion ${item.attributes.uid}`)
                    } catch (err) {
                        console.err(err);
                        console.log(`Problem marking message for deletion: ${item.attributes.uid}. Exiting`);
                        process.exit(108);
                    }
                    const sendMail = await triggerResponseEmail(address, name);
                    if(sendMail !== true) {
                        console.error("Error sending messages. Exiting.");
                        process.exit(108);
                    }
                    resolve();
                })
            })
        }, Promise.resolve());
        try {
            await new Promise((res) => connection.imap.closeBox(true, res));
        } catch(err) {
            console.error("Error closing connection. Exiting.");
            process.exit(110);
        }
        connection.end();
        return true;
    } catch (error){
        if(test===true) {
            console.log(error); 
            return false; 
        }
        console.error("Error collecting messages. Exiting.");
        process.exit(100);
    }
};

const run = async function() {
    console.log("-> Starting up the node autoresponder script.");
    if(noSelfTest !== true) {
        console.log("--> Starting self-test");
        console.log("---> Trying to collect emails.");
        const IMAPSystemOnline = await getMailsProcess(true);
        if(!IMAPSystemOnline) {
            console.error("No IMAP-connection possible. Error log above. Exiting.");
            process.exit(100);
        }
        console.log("---> Trying to send emails.");
        const SMTPSystemOnline = await triggerResponseEmail("markusfluer@markusfluer.de", "Markus", true);
        if(!SMTPSystemOnline) {
            console.error("No SMTP-connection possible. Error log above. Exiting.");
            process.exit(105);
        }
    }
    console.log("-> Started up, creating interval.")
    getMailsProcess();
    setInterval(getMailsProcess, 10000);
}

run();