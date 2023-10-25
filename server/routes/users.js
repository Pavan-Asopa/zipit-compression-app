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

// const queueName = 'ZipIt.fifo';

// const params = {
//   QueueNamePrefix: queueName,
// };

// const createQueueIfNotExists = async (queueName, params) => {
//   try {
//     const data = await sqs.listQueues(params).promise();

//     if (data.QueueUrls && data.QueueUrls.length > 0) {
//       console.log(`SQS FIFO queue "${queueName}" already exists.`);
//       return data.QueueUrls[0]; // Return the existing queue URL
//     } else {
//       const createParams = {
//         QueueName: queueName,
//         Attributes: {
//           FifoQueue: 'true',
//         },
//       };

//       const createData = await sqs.createQueue(createParams).promise();
//       console.log('SQS FIFO queue created:', createData.QueueUrl);
//       return createData.QueueUrl; // Return the newly created queue URL
//     }
//   } catch (error) {
//     console.error('Error:', error);
//     return null; // Return null if an error occurs
//   }
// };

// (async () => {
//   const queueUrl = await createQueueIfNotExists(queueName, params);

//   if (queueUrl) {
//     // You can now use the queueUrl constant in your application
//     console.log('Queue URL:', queueUrl);
//   }
// })();

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
  // const numFiles = req.numFiles;
  const uploadedFiles = req.files;
  const time = req.body.uploadTime;

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

//File compression

async function processQueueMessage(message) {
  try {
    const messageBody = JSON.parse(message.Body);
    const fileName = messageBody.message;

    // Download the uncompressed file from S3
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };
    const uncompressedFile = await s3.getObject(params).promise();

    // Perform file compression using AdmZip
    const compressedFileData = compressFile(fileName, uncompressedFile.Body);

    // Upload the compressed file back to S3
    const compressedFileName = fileName.replace(/\.[^.]+$/, ".zip");

    // Upload the compressed file back to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: `zipped/${compressedFileName}`,
      Body: compressedFileData,
    };

    await s3.upload(uploadParams).promise();
    console.log(
      `File ${fileName} compressed and saved as ${compressedFileName} in S3.`
    );

    // Delete the processed message from the queue
    await sqs
      .deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      })
      .promise();
  } catch (error) {
    if (error.statusCode === 404) {
      console.log("Specified file to compress in not present in the s3 bucket. Deleting message from queue");
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
        WaitTimeSeconds: 20, // Adjust the wait time as needed
      })
      .promise();

    if (messages.Messages && messages.Messages.length > 0) {
      const message = messages.Messages[0];
      await processQueueMessage(message);
    }
    else {
      console.log("No messages in the queue, continuing to poll for messages");
    }
  }
}

pollQueue();

//return compressed file to front end

router.post("/download", async (req, res) => {
  const name = req.body.name;
});

module.exports = router;
