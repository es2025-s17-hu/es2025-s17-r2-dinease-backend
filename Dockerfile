# Use a lightweight version of Node.js as a parent image
FROM node:16-alpine

# Set the working directory in the Docker container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json to work directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Bundle the source code inside the Docker image
COPY . .

# Your application binds to port 5000, so use the EXPOSE instruction to have it mapped by the docker daemon
EXPOSE 5000

# Define the command to run your app using CMD which defines your runtime
CMD [ "node", "main.js" ]
