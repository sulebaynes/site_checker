const https = require('https');
const nodemailer = require("nodemailer");

var options = {
    emailFrom: '',
    emailTo: '',
    password: '',
    subject: '',
    html: '',
    };

exports.init = function (opts) {
    options = opts;
    request((initstate) => {
        log("got initial state");
        loop(initstate);
    })
}

function request(f) {
    const reqOptions = {
        rejectUnauthorized: false,
        hostname: options.hostname,
        port: 443,
        path: options.path,
        method: 'GET'
    };
    var body = "";
    var req = https.request(reqOptions, (res) => {
        log('statusCode: ' + res.statusCode);
      
        if (res.statusCode > 300 && res.statusCode < 400) {
            var location = res.headers.location
            var cookie = res.headers["set-cookie"].map(x => x.replace('path=/', '').replace('Path=/', '')).join('')
            const reqOptions2 = {
                rejectUnauthorized: false,
                hostname: options.hostname,
                port: 443,
                path: location,
                method: 'GET',
                headers: {
                    'cookie': cookie
                }
            }
            var req2 = https.request(reqOptions2, (res2) => {
                log(res2.statusCode)   
                res2.on('data', (d) => {
                    var chunk = d.toString();
                    body = body + chunk;
                });
                
                res2.on('end', () => {
                    f(body.replace(/\r?\n|\r/g, " ").match(/collapsible-body.*/)[0].match(/.*background:url/)[0]);
                });
            })   
            
            req2.on('error', (e) => {
                console.error(e);
            });

            req2.end()

        } else {
            res.on('data', (d) => {
                var chunk = d.toString();
                body = body + chunk;
              });
            
            res.on('end', () => {
                log(body);
                f(body.replace(/\r?\n|\r/g, " ").match(/collapsible-body.*/)[0].match(/.*background:url/)[0]);
              });
        }
        
      });

      req.on('error', (e) => {
        console.error(e);
    });
    req.end();
}
function send_mail() {
    log("sending mail");
    var transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
            user: options.emailFrom,
            pass: options.password
        }
    })
    var mailOptions = {
        from: options.emailFrom,
        to: options.emailTo,
        subject: options.subject,
        html: options.html
    }
    transporter.sendMail(mailOptions, (err, info)=>{
        console.log(err, info);
    })
 }

function log(msg) {
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date+' '+time;
    console.log(dateTime + ': ', msg);
 }

function loop(initstate) {
    request((body) => {
        if (initstate !== body) {
            log("site status has changed");
            send_mail();
        } else {
            log("no change");
            setTimeout(() => { loop(initstate) }, 1000 * 120);
        }
    } )
}


