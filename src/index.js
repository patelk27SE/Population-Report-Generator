/* Import dependencies */
import express from "express";
import path from "path";
import session from "express-session";
import bcrypt from "bcrypt";
import pool from "./services/db.connection.mjs";

// Import controllers
import * as countryController from "./controllers/country.controller.mjs";
import * as cityController from "./controllers/city.controller.mjs";
import * as capitalController from "./controllers/capital.controller.mjs";
import * as urbanRuralController from "./controllers/urbanRural.controller.mjs";
import * as languageController from "./controllers/language.controller.mjs";
import * as populationController from "./controllers/population.controller.mjs";

/* Create express instance */
const app = express();
const port = 3000;

/* Add form data middleware */
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}));


import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//Use the pug template engine
app.set("view engine", "pug");
app.set('views', path.join(__dirname, 'views'));

//Add a static files location
app.use(express.static("static"));


/* Routes */
app.get('/', (req, res) => {
    res.render('login');
});

// Login
app.get("/login", (req, res) => {
    res.render("login");
});
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    // Retrieve user from the database
    const [rows] = await pool.query('SELECT * FROM users WHERE Username = ?', [username]);
    const user = rows[0];
    if (user && await bcrypt.compare(password, user.Password)) {
        console.log('User logged in:', user.Username);
        req.session.userId = user.ID;
        console.log('User ID:', req.session.userId);
        res.redirect('/population');
    } else {
        res.send('Invalid username or password');
    }
});

// Register
app.get("/register", (req, res) => {
    res.render("register");
});
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds
    // Store the user in the database
    await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username,email, hashedPassword]);
    res.redirect('/');
});


app.get('/logout', function (req, res) {
    req.session.destroy();
    res.redirect('/login');
    });

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        console.log('User is not logged in');
        return res.redirect('/');
    }
    next();
}
// Account
app.get("/account", async (req, res) => {
    const { auth, userId } = req.session;

    if (!auth) {
        return res.redirect("/login");
    }

    const sql = `SELECT id, email FROM user WHERE user.id = ${userId}`;
    const [results, cols] = await conn.execute(sql);
    const user = results[0];

    res.render("account", { user });
});

app.post("/api/register", async (req, res) => {
    const { email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    try {
        const sql = `INSERT INTO user (email, password) VALUES ('${email}', '${hashed}')`;
        const [result, _] = await conn.execute(sql);
        const id = result.insertId;
        req.session.auth = true;
        req.session.userId = id;
        return res.redirect("/account");
    } catch (err) {
        console.error(err);
        return res.status(400).send(err.sqlMessage);
    }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(401).send("Missing credentials");
    }

    const sql = `SELECT id, password FROM user WHERE email = '${email}'`;
    const [results, cols] = await conn.execute(sql);

    const user = results[0];

    if (!user) {
        return res.status(401).send("User does not exist");
    }

    const { id } = user;
    const hash = user?.password;
    const match = await bcrypt.compare(password, hash);

    if (!match) {
        return res.status(401).send("Invalid password");
    }

    req.session.auth = true;
    req.session.userId = id;

    return res.redirect("/account");
});

app.get("/population", requireAuth, populationController.getPopulation);
app.get("/capitals", requireAuth, capitalController.getCapitals);
app.get("/countries", requireAuth, countryController.getCountries);
app.get("/cities", requireAuth, cityController.getCities);
app.get("/urbanRural", requireAuth, urbanRuralController.getUrbanRuralPopulation);
app.get("/languages", requireAuth, languageController.getLanguages);
app.get("/updateCountry", (req, res) => {
    res.render("updateCountry");
});

app.post('/updateCountry', async (req, res) => {
    try {
        const { countryCode, name, continent, region, population, capital } = req.body;
        // Update country details in the database
        await pool.query('UPDATE country SET Name = ?, Continent = ?, Region = ?, Population = ?, Capital = ? WHERE CountryCode = ?', [name, continent, region, population, capital, countryCode]);
        res.redirect('/'); // Redirect to home page or appropriate route
    } catch (error) {
        console.error('Error updating country:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Run server!
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
