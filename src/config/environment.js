require('dotenv').config();

module.exports = {
    server: {
        port: process.env.PORT || 3000
    },
    jwtAuth: {
        username: process.env.JWT_USERNAME,
        password: process.env.JWT_PASSWORD
    },
    meta: {
        baseUrl: process.env.META_BASE_URL
    },
    bucket: {
        baseUrl: process.env.BUCKET_URL,
        apiKey: process.env.BUCKET_API_KEY,
    }
}; 