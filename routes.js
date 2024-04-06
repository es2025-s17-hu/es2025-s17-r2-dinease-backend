import { Router } from "express"
import db from "./db.js"
import bcrypt from "bcrypt"
import fs from "fs"
const router = Router()

router.use((req, res, next) => {
	res.set("Content-Type", "application/json")
	res.set("Access-Control-Allow-Origin", "*")
	res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
	res.set("Access-Control-Allow-Headers", "*")
	next()
})

router.get("/plans", async (req, res) => {
	try {
		const [results] = await db.execute("SELECT * FROM `plans`;")
		res.send(results)
	} catch (error) {
		console.error(error)
		res.status(500).send({ error: "Plans not found" })
	}
})

router.put("/plans/:id", async (req, res) => {
	try {
		const { id } = req.params
		const [plan] = await db.execute(
			"SELECT * FROM `plans` WHERE `id` = ?;",
			[id]
		)
		if (plan.length === 0) {
			return res.status(404).send({ error: "Plan not found" })
		}
		const {
			name,
			monthlyFee,
			yearlyFee,
			maxNumberOfRestaurants,
			description,
		} = req.body
		const newPlan = {
			name: name || plan[0].name,
			monthlyFee: monthlyFee || plan[0].monthlyFee,
			yearlyFee: yearlyFee || plan[0].yearlyFee,
			maxNumberOfRestaurants:
				maxNumberOfRestaurants || plan[0].maxNumberOfRestaurants,
			description: description || plan[0].description,
		}
		await db.execute(
			"UPDATE `plans` SET `name` = ?, `monthlyFee` = ?, `yearlyFee` = ?, `maxNumberOfRestaurants` = ?, `description` = ? WHERE `id` = ?;",
			[
				newPlan.name,
				newPlan.monthlyFee,
				newPlan.yearlyFee,
				newPlan.maxNumberOfRestaurants,
				newPlan.description,
				id,
			]
		)

		res.send(newPlan)
	} catch (error) {
		console.error(error)
		res.status(500).send({ error: "Plan update failed" })
	}
})

router.get("/roles", async (req, res) => {
	try {
		const [results] = await db.execute("SELECT * FROM `roles`;")
		res.send(results)
	} catch (error) {
		console.error(error)
		res.status(500).send({ error: "Roles not found" })
	}
})

router.get("/reviews", async (req, res) => {
	try {
		const [results] = await db.execute("SELECT * FROM `reviews`;")
		res.send(results)
	} catch (error) {
		console.error(error)
		res.status(500).send({ error: "Reviews not found" })
	}
})

router.delete("/reviews/:id", async (req, res) => {
	try {
		const { id } = req.params
		await db.execute("DELETE FROM `reviews` WHERE `id` = ?;", [id])
		res.send({ id })
	} catch (error) {
		console.error(error)
		res.status(500).send({ error: "Review deletion failed" })
	}
})

router.get("/users", async (req, res) => {
	try {
		const [results] = await db.execute(
			"SELECT id, firstName, lastName, email, isActive, annualPayment FROM `users`;"
		)
		res.send(results)
	} catch (error) {
		console.error(error)
		res.status(500).send({ error: "Users not found" })
	}
})

router.get("/users/:id", async (req, res) => {
	try {
		const { id } = req.params
		const [results] = await db.execute(
			"SELECT id, firstName, lastName, email, roleId, planId, isActive, annualPayment FROM `users` WHERE `id` = ?;",
			[id]
		)
		results[0].isActive = !!results[0].isActive
		results[0].annualPayment = !!results[0].annualPayment
		res.send(results[0])
	} catch (error) {
		console.error(error)
		res.status(500).send({ error: "User not found" })
	}
})

router.put("/users/:id", async (req, res) => {
	try {
		const { isActive, annualPayment } = req.body
		const { id } = req.params
		const [user] = await db.execute(
			"SELECT * FROM `users` WHERE `id` = ?;",
			[id]
		)
		if (user.length === 0) {
			return res.status(404).send({ error: "User not found" })
		}
		await db.execute("UPDATE `users` SET `isActive` = ?, `annualPayment` = ?, WHERE `id` = ?;", [
			isActive,
			annualPayment || false,
			id,
		])
		res.send({ id, isActive, annualPayment })
	} catch (error) {
		console.error(error)
		res.status(500).send({ error: "User activation failed" })
	}
})

router.get("/restaurants", async (req, res) => {
	try {
		const [restaurants] = await db.execute(
			"SELECT id, name, city, cuisine, address, zipCode, countryCode, description, imageUrl FROM `restaurants`;"
		)
		const [reviews] = await db.execute(
			"SELECT restaurantId, AVG(rating) AS rating FROM `reviews` GROUP BY restaurantId;"
		)
		restaurants.forEach((restaurant) => {
			const { id } = restaurant
			const rating = reviews.find((review) => review.restaurantId === id)
			restaurant.rating = rating ? rating.rating : null
		})
		res.send(restaurants)
	} catch (error) {
		console.error(error)
		res.status(500).send({ error: "Restaurants not found" })
	}
})

router.post("/registration", async (req, res) => {
	try {
		const { restaurants, firstName, lastName, email, password, planId, annualPayment } =
			req.body

		const hash = bcrypt.hashSync(password, 10)

		const [results] = await db.execute(
			"INSERT INTO `users` (`firstName`, `lastName`, `email`, `password`, `roleId`, `planId`, `isActive`, `annualPayment`) VALUES (?, ?, ?, ?, 2, ?, 1, ?);",
			[firstName, lastName, email, hash, planId, annualPayment]
		)
		const userId = results.insertId

		for (const restaurant of restaurants) {
			const { name, city, cuisine, address, zipCode, countryCode } =
				restaurant

			const [results2] = await db.execute(
				"INSERT INTO `restaurants` (`name`, `city`, `cuisine`, `address`, `zipCode`, `countryCode`) VALUES (?, ?, ?, ?, ?, ?);",
				[name, city, cuisine, address, zipCode, countryCode]
			)
			const restaurantId = results2.insertId
			await db.execute(
				"INSERT INTO `userRestaurant` (`userId`, `restaurantId`) VALUES (?, ?);",
				[userId, restaurantId]
			)
		}
		res.status(201).send({ message: "Registration successful" })
	} catch (error) {
		console.error(error)
		const errMsg =
			error.code === "ER_DUP_ENTRY"
				? "Username already exists"
				: "Registration failed"
		res.status(500).send({ error: errMsg })
	}
})

router.post("/reset-db", async (req, res) => {
	try {
		// ignore foreign key checks
		await db.execute("SET FOREIGN_KEY_CHECKS = 0;")
		await db.execute("DROP TABLE IF EXISTS `reviews`")
		await db.execute("DROP TABLE IF EXISTS `restaurants`")
		await db.execute("DROP TABLE IF EXISTS `plans`")
		await db.execute("DROP TABLE IF EXISTS `roles`")
		await db.execute("DROP TABLE IF EXISTS `userRestaurant`")
		await db.execute("DROP TABLE IF EXISTS `users`")
		await db.execute("SET FOREIGN_KEY_CHECKS = 1;")

		console.log("Loading dump from:")
		console.log(process.cwd() + "/dump.sql")

		//  load dump.sql and run it
		const dump = fs
			.readFileSync(process.cwd() + "/dump.sql", "utf-8")
			.split("\n")
			.filter(Boolean)
			.filter((line) => !line.startsWith("--"))
			.join(" ")
			.split(";")
			.filter(Boolean)

		for (const query of dump) {
			await db.query(query.trim() + ";")
		}
		console.log("The database reset was successful")
		res.send({ message: "The database reset was successful" })
	} catch (error) {
		console.error(error)
		res.status(500).send({ error: "Database reset failed" })
	}
})

export default router
