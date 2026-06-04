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

// Helper function te create house slug

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

    return {
        ...foundHouse,
        street: foundHouse.street.trim(),
        slug: targetSlug
    };
}

// Give house info to all pages
async function loadHouseMiddleware(req, res, next) {
    try {
        const foundHouse = await getHouseBySlug(req.params.house_slug);
        if (!foundHouse) {
            return res.status(404).render('404.liquid');
        }

        const cleanStreet = foundHouse.street ? foundHouse.street.trim() : '';
        const cleanNr = foundHouse.house_nr ? foundHouse.house_nr.toString().trim() : '';
        const currentHouse = `${cleanStreet} ${cleanNr}`.trim();
        
        // Handle measurements cleanly
        const m2Wonen = Number(foundHouse.m2) || 0;
        const m2Garden = Number(foundHouse.m2_garden) || 0;
        const totalM2 = m2Wonen + m2Garden;
        const price = Number(foundHouse.price) || 0;
        const priceM2 = totalM2 > 0 ? Math.ceil(price / totalM2) : 0;

        // Visibility Flags based on DB existence
        const hasGarden = m2Garden > 0;
        // Check if description mentions garage/berging, or assume fallback if it's a premium villa property type
        const hasGarage = foundHouse.description ? foundHouse.description.toLowerCase().includes('garage') : false;
        const hasParking = foundHouse.description ? (foundHouse.description.toLowerCase().includes('parkeer') || hasGarage) : false;

        // --- RANDOM GENERATOR FOR MISSING DETAILS ONLY ---
        const energyLabels = ["A", "B", "C", "D", "E", "F"];
        const houseTypes = ["Villa, vrijstaande woning", "Middenwoning", "Hoekwoning", "Twee-onder-één-kap", "Appartement"];
        const availabilities = ["Beschikbaar", "Verkocht onder voorbehoud", "In optie"];
        const agreements = ["In overleg", "Per direct", "In overleg (langere termijn)"];
        const cadastralSections = ["H", "G", "K", "A", "B", "F"];
        const ownershipPool = ["Volle eigendom", "Eigendom belast met erfpacht", "Zie akte"];

        const randomEnergyLabel = energyLabels[Math.floor(Math.random() * energyLabels.length)];
        const randomHouseType = houseTypes[Math.floor(Math.random() * houseTypes.length)];
        const randomAvailability = availabilities[Math.floor(Math.random() * availabilities.length)];
        const randomAgreement = agreements[Math.floor(Math.random() * agreements.length)];
        
        const dbCity = foundHouse.city ? foundHouse.city.trim().toUpperCase() : "ONBEKEND";
        const randomCadaster = `${dbCity} ${cadastralSections[Math.floor(Math.random() * cadastralSections.length)]} ${Math.floor(Math.random() * 8000) + 1000}`;
        const randomOwnership = ownershipPool[Math.floor(Math.random() * ownershipPool.length)];

        const randomBuildYear = Math.floor(Math.random() * (2022 - 1920 + 1)) + 1920; 
        const totalRooms = Number(foundHouse.rooms) || 3;
        const randomBedrooms = totalRooms > 1 ? totalRooms - 1 : 1; 

        req.house = {
            ...foundHouse,
            current_house: currentHouse,
            total_m2: totalM2,
            price_m2: priceM2,
            availability: randomAvailability,
            agreement: randomAgreement,
            energy_label: randomEnergyLabel,
            construction_year: randomBuildYear,
            house_type: randomHouseType,
            rooms_detail: `${totalRooms} kamers (${randomBedrooms} slaapkamers)`,
            bathrooms_detail: "2 badkamers en 1 apart toilet",
            bathroom_features: "2 douches, dubbele wastafel, ligbad, 2 toiletten, vloerverwarming, en wastafel",
            cadastral_id: randomCadaster,
            ownership: randomOwnership,
            
            // Appending feature switches to payload
            has_garden: hasGarden,
            has_garage: hasGarage,
            has_parking: hasParking
        };

        next();
    } catch (error) {
        console.error("Error fetching house:", error);
        res.status(500).send('Server Error');
    }
}
// Routes

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