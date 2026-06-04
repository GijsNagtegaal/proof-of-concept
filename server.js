import express from 'express';
import { Liquid } from 'liquidjs';
import { fileURLToPath } from 'url';
import path from 'path';
import methodOverride from 'method-override';

const api = "https://fdnd-agency.directus.app/items/";

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

function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

async function getHouseBySlug(city, slug) {
    const url = `${api}f_houses?fields=*.*&limit=-1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('API fetch failed');
    
    const json = await response.json();
    const houses = json.data || [];

    const targetCity = city.toLowerCase().replace(/\s+/g, '');
    const targetSlug = slug.toLowerCase().replace(/\s+/g, '');

    const foundHouse = houses.find(house => {
        if (!house.street || !house.city) return false;
        
        const cityClean = house.city.toLowerCase().replace(/\s+/g, '');
        const streetClean = house.street.toLowerCase().replace(/\s+/g, '');
        const nrClean = house.house_nr.toString().toLowerCase().replace(/\s+/g, '');
        
        return cityClean === targetCity && (streetClean + nrClean) === targetSlug;
    });

    if (!foundHouse) return null;

    return {
        ...foundHouse,
        street: foundHouse.street.trim(),
        slug: targetSlug
    };
}

async function loadHouseMiddleware(req, res, next) {
    try {
        const { city, house_slug } = req.params;
        const foundHouse = await getHouseBySlug(city, house_slug);
        
        if (!foundHouse) {
            return res.status(404).render('404.liquid');
        }

        const cleanStreet = foundHouse.street ? foundHouse.street.trim() : '';
        const cleanNr = foundHouse.house_nr ? foundHouse.house_nr.toString().trim() : '';
        const currentHouse = `${cleanStreet} ${cleanNr}`.trim();
    
        const m2Wonen = Number(foundHouse.m2) || 0;
        const m2Garden = Number(foundHouse.m2_garden) || 0;
        const totalM2 = m2Wonen + m2Garden;
        const price = Number(foundHouse.price) || 0;
        const priceM2 = totalM2 > 0 ? Math.ceil(price / totalM2) : 0;

        const hasGarden = m2Garden > 0;
        const hasGarage = foundHouse.description ? foundHouse.description.toLowerCase().includes('garage') : false;
        const hasParking = foundHouse.description ? (foundHouse.description.toLowerCase().includes('parkeer') || hasGarage) : false;

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
            rooms_detail: `${totalRooms} kamers (${randomBedrooms} slaangkamers)`,
            bathrooms_detail: "2 badkamers en 1 apart toilet",
            bathroom_features: "2 douches, dubbele wastafel, ligbad, 2 toiletten, vloerverwarming, en wastafel",
            cadastral_id: randomCadaster,
            ownership: randomOwnership,
            
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

app.get('/', async (req, res) => {
    res.render('index.liquid', { testje: "Funda" });
});

app.get('/favorieten', async (req, res) => {
    try {
        const response = await fetch(`${api}f_list`);
        if (!response.ok) throw new Error('API fetch failed');

        const json = await response.json();
        const lists = json.data || [];

        const formattedLists = lists.map(list => ({
            ...list,
            slug: slugify(list.title)
        }));

        res.render('favorite-lists-overview.liquid', { lists: formattedLists });
    } catch (error) {
        console.error("Error loading lists overview:", error);
        res.status(500).send('Server Error');
    }
});

app.get('/favorieten/nieuw', async (req, res) => {
    res.render('favorites-new-list.liquid');
});

app.post('/favorieten/nieuw', async (req, res) => {
    try {
        const { title, description, icon } = req.body;

        const response = await fetch(`${api}f_list`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                description: description,
                icon: icon || 'house',
                houses: [],
                users: []
            })
        });

        if (!response.ok) throw new Error('API post failed');

        res.redirect('/favorieten');
    } catch (error) {
        console.error("Error creating new list:", error);
        res.status(500).send('Server Error');
    }
});

app.get('/favorieten/:list_slug', async (req, res) => {
    try {
        const { list_slug } = req.params;

        const [listsResponse, housesResponse] = await Promise.all([
            fetch(`${api}f_list?fields=*.*`),
            fetch(`${api}f_houses?fields=*.*&limit=-1`)
        ]);

        if (!listsResponse.ok || !housesResponse.ok) throw new Error('API fetch failed');

        const listsJson = await listsResponse.json();
        const housesJson = await housesResponse.json();

        const allLists = listsJson.data || [];
        const allHouses = housesJson.data || [];

        const list = allLists.find(l => slugify(l.title) === list_slug);

        if (!list) {
            return res.status(404).render('404.liquid');
        }

        const savedHousesData = list.houses || [];
        const savedHouseIds = savedHousesData.map(item => item.f_houses_id);

        const filteredHouses = allHouses.filter(house => savedHouseIds.includes(house.id)).map(house => {
            const cleanStreet = house.street ? house.street.toLowerCase().replace(/\s+/g, '') : '';
            const cleanNr = house.house_nr ? house.house_nr.toString().toLowerCase().replace(/\s+/g, '') : '';
            return {
                ...house,
                city_clean: house.city ? house.city.toLowerCase().trim() : 'onbekend',
                street_clean: house.street ? house.street.toLowerCase().trim() : '',
                slug: `${cleanStreet}${cleanNr}`
            };
        });

        res.render('favorites-detail.liquid', { 
            list: { ...list, slug: list_slug }, 
            houses: filteredHouses 
        });
    } catch (error) {
        console.error("Error loading specific list details:", error);
        res.status(500).send('Server Error');
    }
});

app.get('/huizen/:city/:street/:house_slug/huis-toevoegen', async (req, res, next) => {
    try {

        const listsResponse = await fetch(`${api}f_list?fields=*.*`);
        if (listsResponse.ok) {
            const listsJson = await listsResponse.json();
            res.locals.lists = listsJson.data || [];
        } else {
            res.locals.lists = [];
        }
        next();
    } catch (error) {
        console.error("Error fetching lists for standalone fallback:", error);
        res.locals.lists = []; 
        next();
    }
}, loadHouseMiddleware, (req, res) => {


    res.render('house-add-fallback.liquid', { house: req.house, lists: res.locals.lists });
});

app.post('/favorieten/opslaan', async (req, res) => {
    try {
        const { house_id, list_id, redirect_back } = req.body;
        if (!house_id || !list_id) throw new Error('Missing house_id or list_id');

        const listResponse = await fetch(`${api}f_list/${list_id}?fields=*.*`);
        if (!listResponse.ok) throw new Error('Failed to fetch list details');

        const listJson = await listResponse.json();
        const list = listJson.data;

        let currentHouses = list.houses || [];
        const targetHouseId = Number(house_id);

        const alreadyExists = currentHouses.some(item => item.f_houses_id === targetHouseId);

        if (!alreadyExists) {
            currentHouses.push({
                f_list_id: Number(list_id),
                f_houses_id: targetHouseId
            });
        }

        const updateResponse = await fetch(`${api}f_list/${list_id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ houses: currentHouses })
        });

        if (!updateResponse.ok) throw new Error('Failed to save house to list');

        if (redirect_back) {
            res.redirect(redirect_back);
        } else {
            res.redirect(`/favorieten/${slugify(list.title)}`);
        }
    } catch (error) {
        console.error("Error saving house to list:", error);
        res.status(500).send('Server Error');
    }
});

app.patch('/favorieten/:id', async (req, res) => {
    try {
        const { title, description, icon } = req.body;
        const { id } = req.params;

        const response = await fetch(`${api}f_list/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                description: description,
                icon: icon
            })
        });

        if (!response.ok) throw new Error('API update failed');

        res.redirect(`/favorieten/${slugify(title)}`);
    } catch (error) {
        console.error("Error updating list:", error);
        res.status(500).send('Server Error');
    }
});

app.get('/huizen/:city/:street/:house_slug/media/fotos', loadHouseMiddleware, (req, res) => {
    res.render('house-media.liquid', { house: req.house });
});

app.get('/huizen/:city/:street/:house_slug', async (req, res, next) => {
    try {
        const listsResponse = await fetch(`${api}f_list?fields=*.*`);
        if (listsResponse.ok) {
            const listsJson = await listsResponse.json();
            res.locals.lists = listsJson.data || [];
        } else {
            res.locals.lists = [];
        }
        next();
    } catch (error) {
        console.error("Error fetching lists for detail page view context:", error);
        res.locals.lists = [];
        next();
    }
}, loadHouseMiddleware, (req, res) => {
    res.render('house-detail.liquid', { house: req.house, lists: res.locals.lists });
});

app.get(['/huizen', '/huizen/:city', '/huizen/:city/:street'], async (req, res) => {
    try {
        const response = await fetch(`${api}f_houses?fields=*.*&limit=-1`);
        if (!response.ok) throw new Error('API fetch failed');
        
        const json = await response.json();
        let houses = json.data || [];

        if (req.params.city) {
            const targetCity = req.params.city.toLowerCase().trim();
            houses = houses.filter(h => h.city && h.city.toLowerCase().trim() === targetCity);
        }

        if (req.params.street) {
            const targetStreet = req.params.street.toLowerCase().trim();
            houses = houses.filter(h => h.street && h.street.toLowerCase().trim() === targetStreet);
        }

        const formattedHouses = houses.map(house => {
            const cleanStreet = house.street ? house.street.toLowerCase().replace(/\s+/g, '') : '';
            const cleanNr = house.house_nr ? house.house_nr.toString().toLowerCase().replace(/\s+/g, '') : '';
            return {
                ...house,
                city_clean: house.city ? house.city.toLowerCase().trim() : 'onbekend',
                street_clean: house.street ? house.street.toLowerCase().trim() : '',
                slug: `${cleanStreet}${cleanNr}`
            };
        });

        let pageTitle = "Alle beschikbare huizen";
        if (req.params.street) {
            pageTitle = `Huizen in de ${req.params.street} (${req.params.city})`;
        } else if (req.params.city) {
            pageTitle = `Huizen in ${req.params.city}`;
        }

        res.render('overview.liquid', { 
            houses: formattedHouses, 
            title: pageTitle 
        });

    } catch (error) {
        console.error("Error loading hackable list:", error);
        res.status(500).send('Server Error');
    }
});

app.listen(8000, () => console.log('Server started: http://localhost:8000'));