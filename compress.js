const AWS = require("aws-sdk");
const fs = require('fs');

// AWS S3 bucket info
const bucketName = "zipit-storage";
const s3 = new AWS.S3();

// AWS SQS queue info
const sqs = new AWS.SQS({ region: "ap-southeast-2" });
const queueUrl = "https://sqs.ap-southeast-2.amazonaws.com/901444280953/ZipIt.fifo";

const { spawn } = require('child_process');

// File compression
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

    // Save the downloaded file to the local file system
    const localFilePath = `/tmp/${fileName}`;
    fs.writeFileSync(localFilePath, uncompressedFile.Body);

    // Perform file compression using 7z command-line tool with ultra compression
    const compressedFileName = fileName.replace(/\.[^.]+$/, ".7z");
    await compressFile(localFilePath, compressedFileName);

    // The file has been compressed by 7z and is ready to be uploaded.
    const compressedFilePath = `/tmp/${compressedFileName}`;

    // Upload the compressed file back to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: `zipped/${compressedFileName}`,
      Body: fs.createReadStream(compressedFilePath),
    };

    await s3.upload(uploadParams).promise();
    console.log(`File ${fileName} compressed and saved as ${compressedFileName} in S3`);

    // Clean up the local files
    fs.unlinkSync(localFilePath);
    fs.unlinkSync(compressedFilePath);

    // Delete the processed message from the queue
    await sqs
      .deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      })
      .promise();
    
    console.log("Deleted message:", fileName);
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(
        "Specified file to compress is not present in the S3 bucket. Deleting message from the queue"
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

async function compressFile(filePath, compressedFileName) {
  // Use the 7z command-line tool with ultra compression to compress the file
  const _7zCommand = `7z a -t7z -mx9 /tmp/${compressedFileName} ${filePath}`;

  const task = spawn(_7zCommand, { shell: true });

  task.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  task.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  return new Promise((resolve, reject) => {
    task.on('close', (code) => {
      if (code === 0) {
        console.log('File compression completed successfully.');
        resolve();
      } else {
        console.error(`File compression failed with code ${code}`);
        reject(code);
      }
    });
  });
}

async function pollQueue() {
  while (true) {
    const messages = await sqs
      .receiveMessage({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10, // Adjust the number of messages to process in each batch
        // WaitTimeSeconds: 10, // Adjust the wait time as needed
      })
      .promise();

    if (messages.Messages && messages.Messages.length > 0) {
      for (const message of messages.Messages) {
        console.log("Processing message:", message.Body);
        await processQueueMessage(message);
      }
    }
  }
}

pollQueue();
