# ZipIt compression web application

This is a web application called ZipIt, which allows users to reduce the size of their files via compression. User can upload up to 20 files at a time, and they will be provided with links to download their compressed files.

This application consists of three separate applications: a client React application, an Express server application, and a worker Node application. The application is setup to scale based on average CPU utilisation of the worker applcation, which performs the file compression.

### How to Run:

Each application is currently located on separate AWS EC2 instances, and each is setup to run on boot of its respective instance. All three need to be running in order for the application to work properly. However, this application can be run and tested locally via the following steps:

#### Client

In the client project directory, you will first need to run:

#### `npm install`

This will install the required dependencies for the project (in a folder called `node_modules`). Then, you will need to run:

#### `npm start`

This should open the client project in a browser window. If a browser window does not automatically open, go to http://localhost:3000 to view the project.

#### Server

In the server project directory, you will again need to run:

#### `npm install`

This will install the required dependencies (in a folder called `node_modules`). You can then run:

#### `npm start`

This will effectively start the server application. Go to http://localhost:3001, and if the page lists "ZipIt Server", then the server is up and running.

#### Worker

In the worker project directory, you will need to run:

#### `npm install`

This will install the required dependencies (in a folder called `node_modules`). You can then run:

#### `node start`

This will start the worker application, which continuously polls an AWS SQS FIFO queue for compression jobs, and completes any available jobs.

Once all three applications are up and running, you can compress your files.
