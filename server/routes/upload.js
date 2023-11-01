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
  const params = {
    MessageBody: messageBody,
    QueueUrl: queueUrl,
    MessageGroupId: "file-compression",
  };
  return sqs.sendMessage(params).promise();
};

router.post("/", upload.array("files", 20), async (req, res) => {
  const name = req.body.name; // get name from request body
  const uploadTime = req.body.uploadTime; // get upload time from request body
  const uploadedFiles = req.files; // get uploaded files from form data files

  if (!uploadedFiles) {
    // if there are no files to upload, return error
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    // upload original files to s3 bucket
    const s3UploadPromises = [];
    for (const file of uploadedFiles) {
      const params = {
        Bucket: bucketName,
        Key: `${name}-${uploadTime}-${file.originalname}`,
        Body: file.buffer, // uploaded file data
      };
      s3UploadPromises.push(s3.upload(params).promise());
      console.log(`File ${file.originalname} uploaded to s3 bucket`); // print feedback
    }
    await Promise.all(s3UploadPromises);

    // add new message to queue for files to be compressed
    for (const file of uploadedFiles) {
      const message = `${name}-${uploadTime}-${file.originalname}`; // message will be used to check s3 bucket for matching file when compressing
      await sendMessageToQueue(JSON.stringify({ message })); // send message to queue
      console.log(`File ${file.originalname} added to queue`); // print feedback
    }

    // return response
    res
      .status(200)
      .json({ message: `Files uploaded to s3 and queued for processing` });
  } catch (error) {
    // catch errors and return response
    console.error("Error uploading files to S3 or queuing:", error);
    res.status(500).json({ error: "Failed to upload files to S3" });
  }
});

router.post("/generatePresignedUrls", async (req, res) => {
  const { files } = req.body;

  try {
    const urls = await Promise.all(
      files.map(async (file) => {
        const s3Params = {
          Bucket: bucketName,
          Key: file.fileName,
          Expires: 120, // URL expiration time in seconds
          ContentType: file.fileType,
        };

        const presignedUrl = await s3.getSignedUrlPromise(
          "putObject",
          s3Params
        );
        return presignedUrl;
      })
    );

    console.log(urls);
    res.json({ urls: urls });
  } catch (error) {
    console.error("Error generating pre-signed URLs:", error);
    return res.status(500).json({ error: "Error generating pre-signed URLs" });
  }
});

module.exports = router;
