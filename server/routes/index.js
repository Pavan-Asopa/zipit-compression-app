var express = require("express");
var router = express.Router();
const AWS = require("aws-sdk");
require("dotenv").config();

// configure aws sdk
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: "ap-southeast-2",
});

// create a unique s3 bucket
const bucketName = "zipit-storage";
const s3 = new AWS.S3();

(async () => {
  try {
    // try creating a new bucket
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`Created bucket: ${bucketName}`);
  } catch (err) {
    // check whether bucket already exists
    if (err.statusCode === 409) {
      console.log(`Bucket ${bucketName} already exists`);
    } else {
      // print any other errors in creating the bucket
      console.log(`Error creating bucket: ${err}`);
    }
  }
})();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "ZipIt Server" });
});

module.exports = router;
