import { fillIPO } from "./pkg/functions.js";
import { getAccountDetails } from "./pkg/input.js";
import { createTransport } from "nodemailer";
const configs = getAccountDetails("./config.yaml");
import { config } from "dotenv";
config();

let transporter;

if (configs.sendmail) {
  transporter = createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });
}

setInterval(async () => {
  for (const account of configs.accounts) {
    try {
      console.log("Filling IPO from account - " + account.boid);
      await fillIPO(
        account,
        configs.kitta,
        configs.timeout * 1000 // convert seconds to ms
      );
    } catch (err) {
      if (
        err.message === "There are no new IPOs." ||
        err.message === "Navigation failed because browser has disconnected!"
      ) {
        console.log(err.message);
      } else {
        const mailOptions = {
          from: process.env.EMAIL,
          to: configs.usermail,
          subject: "Unable to apply IPO!",
          text: err.message,
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log("Unable to send message!!");
            process.exit(1);
          } else {
            console.log("Error mail sent:" + info.response);
          }
        });
        // TODO: send mail about failure
        console.log(err);
        if (configs.sendmail) {
          transporter;
        }
      }
    }
  }
}, 1000 * 60 * 60 * 24);
