var express = require("express");
var router = express.Router();

// aws variables / setup
const AWS = require("aws-sdk");
require("dotenv").config();

// file transfer
const multer = require("multer");
const storage = multer.memoryStorage();

// file compression
const AdmZip = require("adm-zip");
const fs = require("fs");

// configure aws sdk
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: "ap-southeast-2",
});

const sqs = new AWS.SQS({ region: "ap-southeast-2" });

const queueName = "ZipIt.fifo";

async function checkAndCreateQueue() {
  try {
    // Check if the queue exists
    const { QueueUrl } = await sqs
      .getQueueUrl({ QueueName: queueName })
      .promise();

    console.log(`Queue ${queueName} already exists with URL: ${QueueUrl}`);
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

      console.log(`Queue ${queueName} created with URL: ${QueueUrl}`);
    } else {
      throw error;
    }
  }
}

checkAndCreateQueue()
  // .then(() => console.log('Queue check and creation complete'))
  .catch((error) => console.error("Error:", error));

const queueUrl =
  "https://sqs.ap-southeast-2.amazonaws.com/901444280953/ZipIt.fifo";

// function to send a message to the SQS FIFO queue
const sendMessageToQueue = async (messageBody) => {
  const params = {
    MessageBody: messageBody,
    QueueUrl: queueUrl,
    MessageGroupId: "file-compression",
  };

  return sqs.sendMessage(params).promise();
};

// create a unique bucket
const bucketName = "zipit-storage";
const s3 = new AWS.S3();

// create multer upload object
const upload = multer({ storage: storage });

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

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("Respond with a resource");
});

router.post("/uploadToS3", upload.array("files", 5), async (req, res) => {
  const name = req.body.name;
  const time = req.body.uploadTime;
  const uploadedFiles = req.files;

  if (!uploadedFiles) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    const s3UploadPromises = [];
    // const uploadTime = Date.now();
    for (const file of uploadedFiles) {
      const params = {
        Bucket: "zipit-storage",
        Key: `${name}-${time}-${file.originalname}`,
        Body: file.buffer, // uploaded file data
      };
      s3UploadPromises.push(s3.upload(params).promise());
      console.log(`File ${file.originalname} uploaded to s3 bucket`);
    }
    await Promise.all(s3UploadPromises);

    for (const file of uploadedFiles) {
      //const fileName = file.originalname;
      const message = `${name}-${time}-${file.originalname}`;
      await sendMessageToQueue(JSON.stringify({ message }));
      console.log(`File ${file.originalname} added to queue`);
    }

    res
      .status(200)
      .json({ message: `Files uploaded to s3 and queued for processing` });
  } catch (error) {
    console.error("Error uploading files to S3 or queuing:", error);
    res.status(500).json({ error: "Failed to upload files to S3" });
  }
});

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
      `File ${fileName} compressed and saved as ${compressedFileName} in S3.`
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
        WaitTimeSeconds: 20, // adjusting wait time as needed
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

// return compressed file to front end
router.post("/download", async (req, res) => {
  const name = req.body.name;
  const uploadTime = req.body.uploadTime;
  const numFiles = req.body.numFiles;
  const prefix = `zipped/${name}-${uploadTime}-`;

  // search zipped folder of S3 bucket for file(s)
  const searchParams = {
    Bucket: bucketName,
    Prefix: prefix,
  };

  let receivedFiles = [];

  const checkForFiles = () => {
    return new Promise((resolve, reject) => {
      const poll = () => {
        s3.listObjectsV2(searchParams, (error, data) => {
          if (error) {
            console.error(error);
            reject(error);
            return;
          }

          const fileNames = data.Contents.filter((object) =>
            object.Key.startsWith(prefix)
          ).map((object) => object.Key.replace("zipped/", ""));

          receivedFiles = receivedFiles.concat(fileNames);

          if (receivedFiles.length >= numFiles) {
            const downloadLinks = receivedFiles.map((fileName) => {
              const params = {
                Bucket: bucketName,
                Key: `zipped/${fileName}`,
                Expires: 3600,
              };
              const presignedURL = s3.getSignedUrl("getObject", params);
              return {
                name: fileName,
                link: presignedURL,
              };
            });
            resolve(downloadLinks);
          } else {
            setTimeout(poll, 5000);
          }
        });
      };
      poll();
    });
  };

  checkForFiles()
    .then((downloadLinks) => {
      res.json(downloadLinks);
    })
    .catch((error) => {
      console.error("Error during file retrieval", error);
      res.status(500).json({ error: "File retrieval failed" });
    });
});

module.exports = router;
