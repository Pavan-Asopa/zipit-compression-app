const express = require("express");
const router = express.Router();
const AWS = require("aws-sdk");
require("dotenv").config();
const multer = require("multer");
const storage = multer.memoryStorage();

// bucket parameters
const bucketName = "zipit-storage";
const s3 = new AWS.S3();

// queue info
const sqs = new AWS.SQS({ region: "ap-southeast-2" });
const queueUrl =
  "https://sqs.ap-southeast-2.amazonaws.com/901444280953/ZipIt.fifo";

// create multer upload object
const upload = multer({ storage: storage });

// function to send a message to the SQS FIFO queue
const sendMessageToQueue = async (messageBody) => {
  const messageParams = {
    MessageBody: messageBody,
    QueueUrl: queueUrl,
    MessageGroupId: "file-compression",
  };
  return sqs.sendMessage(messageParams).promise();
};

// post route to upload and queue new files for compression
router.post("/", upload.array("files", 20), async (req, res) => {
  const name = req.body.name; // get name from request body
  const uploadTime = req.body.uploadTime; // get upload time from request body
  const uploadedFiles = req.files; // get uploaded files from form data files

  if (!uploadedFiles) {
    // if there are no files to upload, return error
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    // upload original files to S3 bucket
    const s3UploadPromises = [];
    for (const file of uploadedFiles) {
      const bucketParams = {
        Bucket: bucketName,
        Key: `${name}-${uploadTime}-${file.originalname}`, // unique key
        Body: file.buffer, // uploaded file data
      };
      s3UploadPromises.push(s3.upload(bucketParams).promise());
      console.log(`File ${file.originalname} uploaded to S3 bucket`); // print feedback
    }
    await Promise.all(s3UploadPromises); // wait for all files to be uploaded

    // add new messages to queue for files to be compressed
    for (const file of uploadedFiles) {
      const message = `${name}-${uploadTime}-${file.originalname}`; // message will be used to check S3 bucket for matching file when compressing
      await sendMessageToQueue(JSON.stringify({ message })); // send message to queue
      console.log(`File ${file.originalname} added to queue`); // print feedback
    }

    // return successful response
    res
      .status(200)
      .json({ message: `Files uploaded to S3 and queued for processing` });
  } catch (error) {
    // catch errors and return error response
    console.error("Error uploading files to S3 or queuing:", error);
    res.status(500).json({ error: "Failed to upload files to S3" });
  }
});

module.exports = router;
