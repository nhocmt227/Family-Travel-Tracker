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

app.get("/", async (req, res) => {
  try {
    const userId = await getFirstUser();
    await handleGet(res, userId);
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json("Internal server error");
  }
});

app.post("/add", async (req, res) => { // add a country to the current user
  const country = req.body["country"];
  const userId = req.body["userId"];
  console.log(country);
  console.log(userId);
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE $1",
      [country.toLowerCase()]
    );
    if (result.rows.length === 0) {
      handleError(res, userId, "The country does not exist, try again");
      return;
    } 
    const countryCode = result.rows[0].country_code;
    console.log(countryCode);
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, userId]
      );
      handleGet(res, userId);
    } catch (err) {
      console.log(err);
      if (err.code == 23505) {
        handleError(res, userId, "The country has already been added, try again");
        return;
      } else {
        handleError(res, userId, "Internal server error");
      }
    }
  } catch (err) {
    console.log(err);
    handleError(res, userId, "Internal server error");
  }
});

app.post("/user", async (req, res) => { // change between users
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

app.post("/new", async (req, res) => { // create new users
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

async function handleError(res, userId, error) {
  const users = await getAllUsers();
  const countries = await checkVisisted(userId);
  const color = await getColorFromUser(userId);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: color,
    userId: userId,
    error: error
  });
}


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

