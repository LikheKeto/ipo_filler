import { createTransport } from "nodemailer";
import { config } from "dotenv";
config();
export const transporter = createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

export const sendMail = (email, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject,
    text,
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Unable to send message!!");
      process.exit(1);
    } else {
      console.log("Email sent:" + info.response);
    }
  });
};
