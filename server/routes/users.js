var express = require("express");
var router = express.Router();
const AWS = require("aws-sdk");
require("dotenv").config();
const AdmZip = require("adm-zip"); // compression

// configure aws sdk
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: "ap-southeast-2",
});

// create a unique bucket
const bucketName = "zipit-storage";
const s3 = new AWS.S3();

// sqs queue info
const sqs = new AWS.SQS({ region: "ap-southeast-2" });
const queueName = "ZipIt.fifo";
const queueUrl =
  "https://sqs.ap-southeast-2.amazonaws.com/901444280953/ZipIt.fifo";

async function checkAndCreateQueue() {
  try {
    // Check if the queue exists
    const { QueueUrl } = await sqs
      .getQueueUrl({ QueueName: queueName })
      .promise();

    console.log(`Queue ${queueName} already exists`);
  } catch (error) {
    if (error.code === "AWS.SimpleQueueService.NonExistentQueue") {
      // Queue doesn't exist, create it
      const params = {
        QueueName: queueName,
        Attributes: {
          FifoQueue: "true",
          ContentBasedDeduplication: "true",
        },
      };
      const { QueueUrl } = await sqs.createQueue(params).promise();
      console.log(`Created queue: ${queueName}`);
      return QueueUrl;
    } else {
      throw error;
    }
  }
}
checkAndCreateQueue().catch((error) => console.error("Error:", error));

// file compression
async function processQueueMessage(message) {
  try {
    const messageBody = JSON.parse(message.Body);
    const fileName = messageBody.message;

    // download the uncompressed file from S3
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };
    const uncompressedFile = await s3.getObject(params).promise();

    // perform file compression using AdmZip
    const compressedFileData = compressFile(fileName, uncompressedFile.Body);

    // upload the compressed file back to S3
    const compressedFileName = fileName.replace(/\.[^.]+$/, ".zip");

    // upload the compressed file back to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: `zipped/${compressedFileName}`,
      Body: compressedFileData,
    };

    await s3.upload(uploadParams).promise();
    console.log(
      `File ${fileName} compressed and saved as ${compressedFileName} in S3`
    );

    // delete the processed message from the queue
    await sqs
      .deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      })
      .promise();
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(
        "Specified file to compress in not present in the s3 bucket. Deleting message from queue"
      );
      await sqs
        .deleteMessage({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        })
        .promise();
    } else {
      console.error("Error processing message:", error);
    }
  }
}

function compressFile(fileName, fileData) {
  const zip = new AdmZip();
  zip.addFile(fileName, fileData);
  return zip.toBuffer();
}

async function pollQueue() {
  while (true) {
    const messages = await sqs
      .receiveMessage({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 10, // adjusting wait time as needed
      })
      .promise();

    if (messages.Messages && messages.Messages.length > 0) {
      const message = messages.Messages[0];
      await processQueueMessage(message);
    } else {
      console.log("No messages in the queue, continuing to poll for messages");
    }
  }
}

pollQueue();

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("Respond with a resource");
});

module.exports = router;
