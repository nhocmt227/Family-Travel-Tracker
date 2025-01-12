import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "World",
  password: "15072005",
  port: 5433,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); 

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

async function checkVisisted(userId) {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [userId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getFirstUser() {
  const result = await db.query("SELECT * FROM users LIMIT 1");
  const userId = result.rows[0].id;
  console.log(userId);
  return userId; 
}

async function getColorFromUser(userId) {
  const result = await db.query("SELECT color FROM users WHERE id = $1", [userId]);
  const color = result.rows[0].color;
  return color;
}

async function getAllUsers() {
  const result = await db.query("SELECT * from users");
  return result.rows;
}

async function handleGet(res, userId) {
  const users = await getAllUsers();
  const countries = await checkVisisted(userId);
  const color = await getColorFromUser(userId);
  console.log(userId);
  console.log(countries);
  console.log(color);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: color,
    userId: userId
  });
}

app.get("/", async (req, res) => {
  try {
    const userId = await getFirstUser();
    await handleGet(res, userId);
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json("Internal server error");
  }
});

app.post("/add", async (req, res) => {
  const country = req.body["country"];
  const userId = req.body["userId"];
  console.log(country);
  console.log(userId);
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE $1",
      [country.toLowerCase()]
    );
    const countryCode = result.rows[0].country_code;
    console.log(countryCode);
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, userId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json("Internal server error");
  }
});

app.post("/user", async (req, res) => {
  try {
    console.log(req.body);
    if (req.body.add) {
      res.render("new.ejs");
    } else {
      const userId = req.body.user;
      await handleGet(res, userId);
    }
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json("Internal server error");
  } 
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  try {
    console.log(req.body);
    const name = req.body.name;
    const color = req.body.color;
    const response = await db.query("INSERT INTO users (name, color) VALUES ($1, $2)", [name, color]);
    res.redirect("/");
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json("Internal server error");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
