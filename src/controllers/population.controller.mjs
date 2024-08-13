import pool from '../services/db.connection.mjs';

export async function getReport(req, res) {
    try {
        const [results] = await pool.query('SELECT * FROM population_reports');
        res.render('report', { reports: results });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).send('Internal Server Error');
    }
}

export async function addReport(req, res) {
    const { country, population, year } = req.body;
    try {
        await pool.query('INSERT INTO population_reports (country, population, year) VALUES (?, ?, ?)', [country, population, year]);
        res.redirect('/report');
    } catch (error) {
        console.error('Error adding report:', error);
        res.status(500).send('Internal Server Error');
    }
}
