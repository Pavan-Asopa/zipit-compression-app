const express = require("express");
const router = express.Router();
const AWS = require("aws-sdk");
require("dotenv").config();

// bucket parameters
const bucketName = "zipit-storage";
const s3 = new AWS.S3();

// post route to return compressed files to client
router.post("/", async (req, res) => {
  const name = req.body.name;
  const uploadTime = req.body.uploadTime;
  const numFiles = req.body.numFiles;

  // create a prefix to be used for searching S3 bucket files
  const prefix = `zipped/${name}-${uploadTime}-`;

  // params to search zipped folder of S3 bucket for files
  const searchParams = {
    Bucket: bucketName,
    Prefix: prefix,
  };

  // create a set to hold unique retrieved filenames
  let retrievedFiles = new Set();

  // check S3 bucket for specified files
  const checkForFiles = () => {
    return new Promise((resolve, reject) => {
      const pollBucket = () => {
        s3.listObjectsV2(searchParams, (error, data) => {
          // list objects from bucket which match prefix
          if (error) {
            // catch errors and reject promise
            console.error(error);
            reject(error);
            return;
          }

          // grab files with names that start with the prefix, and then remove zipped/ from the filename
          const fileNames = data.Contents.filter((object) =>
            object.Key.startsWith(prefix)
          ).map((object) => object.Key.replace("zipped/", ""));

          // add retrieved files to set to ensure uniqueness
          fileNames.forEach((fileName) => retrievedFiles.add(fileName));

          // check whether length of retrieved files array matches the number of files expected
          if (retrievedFiles.size >= numFiles) {
            const downloadLinks = Array.from(retrievedFiles).map((fileName) => {
              const bucketParams = {
                Bucket: bucketName,
                Key: `zipped/${fileName}`,
                Expires: 1800, // expiration time in seconds (30 mins)
              };
              const presignedURL = s3.getSignedUrl("getObject", bucketParams); // get presigned URL for file download
              return {
                name: fileName,
                link: presignedURL,
              };
            });
            resolve(downloadLinks); // resolve promise
          } else {
            // set timeout to keep polling bucket until retrieve correct number of files
            setTimeout(pollBucket, 10000);
          }
        });
      };
      pollBucket(); // call pollBucket() function
    });
  };

  // check for files and return response, which includes links for user to download from client
  checkForFiles()
    .then((downloadLinks) => {
      res.status(200).json(downloadLinks); // return successful response
    })
    .catch((error) => {
      // catch errors and return error response
      console.error("Error during file retrieval", error);
      res.status(500).json({ error: "File retrieval failed" });
    });
});

module.exports = router;
