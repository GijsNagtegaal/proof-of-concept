// Import all npm packages

import express from 'express';
import { Liquid } from 'liquidjs';
import { fileURLToPath } from 'url';
import path from 'path';
import methodOverride from 'method-override';

// base directus URL 

const api = "https://fdnd-agency.directus.app/items/"

// setup the app

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());
app.use(methodOverride('_method'));

const engine = new Liquid();
app.engine('liquid', engine.express());
app.set('views', './views');
app.set('view engine', 'liquid');

app.get('/alle-huizen', async (req, res) => {
    res.render('index.liquid', {
        testje: "Funda"
    });
});

// get the house detail page
app.get('/huis/:house_slug', async (req, res) => {
    try {
        const response = await fetch(api + "f_houses?fields=*.*.*");
        const json = await response.json();
        const houses = json.data;

        const slug = req.params.house_slug.toLowerCase().trim();

        const house = houses.find(h => {
            return h.street && h.street.toLowerCase().trim() === slug;
        });

        if (!house) {
            return res.status(404).render('404.liquid');
        }

        res.render('house-detail.liquid', { house: house });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});


app.get('/', async (req, res) => {
    res.render('index.liquid', {
        testje: "Funda"
    });
});

app.listen(8000, () => console.log('Server started: http://localhost:8000'));

