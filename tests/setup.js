// Make sure we are working with localstack and not the real AWS services

process.env.AWS_ENDPOINT_URL = 'http://localhost:4566';
process.env.AWS_ACCESS_KEY_ID = 'testing';
process.env.AWS_SECRET_ACCESS_KEY = 'testing';
process.env.AWS_DEFAULT_REGION = 'us-east-1';
