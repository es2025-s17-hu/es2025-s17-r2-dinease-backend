import express from "express"
import routes from "./routes.js"

const app = express()

app.use(express.json())
app.use("/api/v1", routes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})
