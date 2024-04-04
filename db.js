import mysql2 from "mysql2/promise"
import dotenv from "dotenv"

dotenv.config()

const connection = await mysql2.createConnection({
	host: process.env.DB_HOST || "localhost",
	user: process.env.DB_USER || "root",
	password: process.env.DB_PASSWORD || "password",
	database: process.env.DB_NAME || "test",
})

export default connection
