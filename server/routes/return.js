const express = require("express");
const router = express.Router();
const AWS = require("aws-sdk");
require("dotenv").config();

// bucket parameters
const bucketName = "zipit-storage";
const s3 = new AWS.S3();

// return compressed file to front end
router.post("/", async (req, res) => {
  const name = req.body.name; // get name from request body
  const uploadTime = req.body.uploadTime; // get upload time from request body
  const numFiles = req.body.numFiles; // get number of files from request body

  // create a prefix to be used for searching s3 bucket files
  const prefix = `zipped/${name}-${uploadTime}-`;

  // search zipped folder of S3 bucket for files
  const searchParams = {
    Bucket: bucketName,
    Prefix: prefix,
  };

  // create a set to hold retrieved unique file names
  let retrievedFiles = new Set();

  // check s3 bucket for specified files
  const checkForFiles = () => {
    return new Promise((resolve, reject) => {
      const pollBucket = () => {
        s3.listObjectsV2(searchParams, (error, data) => {
          // list objects from bucket which match prefix
          if (error) {
            // catch errors
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
              const params = {
                Bucket: bucketName,
                Key: `zipped/${fileName}`,
                Expires: 3600,
              };
              const presignedURL = s3.getSignedUrl("getObject", params); // get presigned URL for user to be able to download files
              return {
                name: fileName,
                link: presignedURL,
              };
            });
            resolve(downloadLinks);
          } else {
            // set timeout to keep polling bucket until retrieve correct number of files
            setTimeout(pollBucket, 10000);
          }
        });
      };
      pollBucket();
    });
  };

  // check for files and return response, which includes links for user to download from front end
  checkForFiles()
    .then((downloadLinks) => {
      res.json(downloadLinks);
    })
    .catch((error) => {
      // catch errors and return response
      console.error("Error during file retrieval", error);
      res.status(500).json({ error: "File retrieval failed" });
    });
});

module.exports = router;
