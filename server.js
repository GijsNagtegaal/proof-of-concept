// Import all npm packages
import express from 'express';
import { Liquid } from 'liquidjs';
import { fileURLToPath } from 'url';
import path from 'path';
import methodOverride from 'method-override';

// Base Directus URL 
const api = "https://fdnd-agency.directus.app/items/";

// Setup the app
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

// --- Helper Functions & Middleware --

async function getHouseBySlug(slug) {

    const url = `${api}f_houses?fields=*.*&limit=-1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('API fetch failed');
    
    const json = await response.json();
    const houses = json.data || [];

    const targetSlug = slug.toLowerCase().trim();

    const foundHouse = houses.find(house => {
        if (!house.street) return false;
        const streetClean = house.street.toLowerCase().trim();
        const nrClean = house.house_nr.toString().toLowerCase().trim();
        return (streetClean + nrClean) === targetSlug;
    });

    if (!foundHouse) return null;

    // Return cleaned house object
    return {
        ...foundHouse,
        street: foundHouse.street.trim(),
        slug: targetSlug
    };
}

/**
 * Middleware to handle repetitive house fetching for detail routes
 */
async function loadHouseMiddleware(req, res, next) {
    try {
        const house = await getHouseBySlug(req.params.house_slug);
        if (!house) {
            return res.status(404).render('404.liquid');
        }
        req.house = house;
        next();
    } catch (error) {
        console.error("Error fetching house:", error);
        res.status(500).send('Server Error');
    }
}

// --- Routes ---

app.get('/', async (req, res) => {
    res.render('index.liquid', { testje: "Funda" });
});

app.get('/alle-huizen', async (req, res) => {
    res.redirect('/');
});

// House Detail Route (Uses Middleware)
app.get('/huis/:house_slug', loadHouseMiddleware, (req, res) => {
    res.render('house-detail.liquid', { house: req.house });
});

// House Media Route (Uses the exact same Middleware)
app.get('/huis/:house_slug/media/fotos', loadHouseMiddleware, (req, res) => {
    res.render('house-media.liquid', { house: req.house });
});

app.listen(8000, () => console.log('Server started: http://localhost:8000'));