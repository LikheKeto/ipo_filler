import { openASBA } from "./pkg/functions.js";
import { getAccountDetails } from "./pkg/input.js";
import { config } from "dotenv";
config();
import { transporter } from "./pkg/emailer.js";
const configs = getAccountDetails("./config.yaml");

console.log("Started service");

const applyIPO = async () => {
  for (const account of configs.accounts) {
    try {
      console.log("Filling IPO from account - " + account.boid);
      await openASBA(
        account,
        configs.kitta,
        configs.timeout * 1000, // convert seconds to ms
        configs.sendmail
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
        if (configs.sendmail) {
          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.log("Unable to send message!!");
              process.exit(1);
            } else {
              console.log("Error mail sent:" + info.response);
            }
          });
        }
        // TODO: send mail about failure
        console.log(err);
        if (configs.sendmail) {
          transporter;
        }
      }
    }
  }
};
await applyIPO();
setInterval(applyIPO, 1000 * 60 * 60 * 24);
