const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");

function connectToDB() {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Server is connected to DB");
    })
    .catch((err) => {
      console.log("An error has occured while connecting DB");
      console.log(err);
      //   process.exit(1);
    });
}

module.exports = connectToDB;
