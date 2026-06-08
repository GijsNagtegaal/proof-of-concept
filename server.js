import express from 'express';
import compression from 'compression'; 
import methodOverride from 'method-override';
import path from 'path';
import { fileURLToPath } from 'url';
import { Liquid } from 'liquidjs';

const app = express();

const api = "https://fdnd-agency.directus.app/items/";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(compression());

// View engine setup
const engine = new Liquid();
app.engine('liquid', engine.express());
app.set('views', './views');
app.set('view engine', 'liquid');

// Helper functions
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

// Herbruikbare middleware voor het ophalen van favorietenlijsten
async function loadListsMiddleware(req, res, next) {
    try {
        const listsResponse = await fetch(`${api}f_list?fields=*.*`);
        res.locals.lists = listsResponse.ok ? (await listsResponse.json()).data || [] : [];
        next();
    } catch (error) {
        console.error("Error fetching lists middleware:", error);
        res.locals.lists = [];
        next();
    }
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

        // Statische fallbacks (voorkomt veranderende data bij elke refresh)
        const totalRooms = Number(foundHouse.rooms) || 3;
        const bedrooms = totalRooms > 1 ? totalRooms - 1 : 1; 

        req.house = {
            ...foundHouse,
            current_house: currentHouse,
            total_m2: totalM2,
            price_m2: priceM2,
            availability: "Beschikbaar",
            agreement: "In overleg",
            energy_label: "A",
            construction_year: 2020,
            house_type: "Middenwoning",
            rooms_detail: `${totalRooms} kamers (${bedrooms} slaapkamers)`,
            bathrooms_detail: "2 badkamers en 1 apart toilet",
            bathroom_features: "2 douches, dubbele wastafel, ligbad, vliering",
            cadastral_id: `${(foundHouse.city || 'UNKN').toUpperCase()} H 1234`,
            ownership: "Volle eigendom",
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

app.get('/favorieten', async (req, res) => {
    try {
        const listResponse = await fetch(`${api}f_list?fields=*.*`);
        if (!listResponse.ok) throw new Error('Lists API fetch failed');
        const listJson = await listResponse.json();
        const lists = listJson.data || [];

        const houseIds = new Set();
        lists.forEach(list => {
            if (list.houses) {
                list.houses.forEach(item => {
                    if (item.f_houses_id) houseIds.add(item.f_houses_id);
                });
            }
        });

        let housesMap = {};
        if (houseIds.size > 0) {
            const idFilter = Array.from(houseIds).join(',');
            // FIX: Added city, street, and house_nr to fields selection
            const housesResponse = await fetch(`${api}f_houses?filter[id][_in]=${idFilter}&fields=id,poster_image,gallery,city,street,house_nr&limit=-1`);
            
            if (housesResponse.ok) {
                const housesJson = await housesResponse.json();
                (housesJson.data || []).forEach(house => {
                    housesMap[house.id] = house;
                });
            }
        }

        const formattedLists = lists.map(list => {
            const enrichedHouses = (list.houses || []).map(item => {
                const realHouseData = housesMap[item.f_houses_id];
                
                // 1. Get raw values safely or default to a placeholder string
                const rawCity = realHouseData && realHouseData.city ? realHouseData.city : 'onbekend';
                const rawStreet = realHouseData && realHouseData.street ? realHouseData.street : 'onbekend';
                const rawNr = realHouseData && realHouseData.house_nr ? realHouseData.house_nr.toString() : '';

                // 2. Clean values for URL generation matching your routing slug requirements
                const cityClean = rawCity.toLowerCase().trim().replace(/\s+/g, '-');
                const streetClean = rawStreet.toLowerCase().trim().replace(/\s+/g, '-');
                
                const cleanStreetNoSpaces = rawStreet.toLowerCase().replace(/\s+/g, '');
                const cleanNrNoSpaces = rawNr.toLowerCase().replace(/\s+/g, '');
                const houseSlug = `${cleanStreetNoSpaces}${cleanNrNoSpaces}` || 'onbekend';

                return {
                    id: item.f_houses_id,
                    poster_image: realHouseData ? realHouseData.poster_image : null,
                    gallery: realHouseData ? realHouseData.gallery : [],
                    city_clean: cityClean,
                    street_clean: streetClean,
                    slug: houseSlug
                };
            });

            return {
                ...list,
                slug: slugify(list.title),
                enriched_houses: enrichedHouses
            };
        });

        res.render('favorite-lists-overview.liquid', { lists: formattedLists });
    } catch (error) {
        console.error("Error loading enriched lists overview:", error);
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                description,
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
        const listsResponse = await fetch(`${api}f_list?fields=*.*`);
        if (!listsResponse.ok) throw new Error('API fetch failed');

        const listsJson = await listsResponse.json();
        const list = (listsJson.data || []).find(l => slugify(l.title) === list_slug);

        if (!list) return res.status(404).render('404.liquid');

        const savedHouseIds = (list.houses || []).map(item => item.f_houses_id);
        
        let filteredHouses = [];
        if (savedHouseIds.length > 0) {
            // OPTIMALISATIE: Alleen benodigde huizen ophalen via Directus filter
            const housesResponse = await fetch(`${api}f_houses?filter[id][_in]=${savedHouseIds.join(',')}&fields=*.*&limit=-1`);
            if (housesResponse.ok) {
                const housesJson = await housesResponse.json();
                filteredHouses = (housesJson.data || []).map(house => {
                    const cleanStreet = house.street ? house.street.toLowerCase().replace(/\s+/g, '') : '';
                    const cleanNr = house.house_nr ? house.house_nr.toString().toLowerCase().replace(/\s+/g, '') : '';
                    return {
                        ...house,
                        city_clean: house.city ? house.city.toLowerCase().trim() : 'onbekend',
                        street_clean: house.street ? house.street.toLowerCase().trim() : '',
                        slug: `${cleanStreet}${cleanNr}`
                    };
                });
            }
        }

        res.render('favorites-detail.liquid', { 
            list: { ...list, slug: list_slug }, 
            houses: filteredHouses 
        });
    } catch (error) {
        console.error("Error loading specific list details:", error);
        res.status(500).send('Server Error');
    }
});

app.get('/huizen/:city/:street/:house_slug/huis-toevoegen', loadListsMiddleware, loadHouseMiddleware, (req, res) => {
    res.render('house-add.liquid', { house: req.house, lists: res.locals.lists });
});

app.post('/favorieten/huis-toevoegen', async (req, res) => {
    try {
        const { house_id, list_id, redirect_back } = req.body;
        if (!house_id || !list_id) throw new Error('Missing house_id or list_id');

        const listResponse = await fetch(`${api}f_list/${list_id}?fields=houses.*,title`); 
        if (!listResponse.ok) throw new Error('Failed to fetch list details');

        const listJson = await listResponse.json();
        const list = listJson.data;

        const targetHouseId = Number(house_id);
        const targetListId = Number(list_id);

        let currentHouses = (list.houses || []).map(item => ({
            f_list_id: targetListId,
            f_houses_id: Number(item.f_houses_id)
        }));

        const alreadyExists = currentHouses.some(item => item.f_houses_id === targetHouseId);

        if (!alreadyExists) {
            currentHouses.push({
                f_list_id: targetListId,
                f_houses_id: targetHouseId
            });
        }
        const updateResponse = await fetch(`${api}f_list/${list_id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                houses: currentHouses 
            })
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.text();
            console.error("Directus API Error Details:", errorData);
            throw new Error('Failed to save house to list');
        }

        // --- Handle Dynamic Redirection & Notification Parameters ---
        const listTitle = list.title || 'Favorieten';
        const listSlug = slugify(listTitle);

        // Safety Net: Use redirect_back if it exists, otherwise read the exact page URL the user came from.
        // If both somehow fail, fallback to the root favorites index.
        const fallbackUrl = req.headers.referer || '/favorieten';
        const finalRedirectDestination = redirect_back || fallbackUrl;

        // Safely parse the path using a dummy base domain so searchParams don't break
        const targetUrl = new URL(finalRedirectDestination, 'http://localhost:8000'); 
        
        targetUrl.searchParams.set('success', 'true');
        targetUrl.searchParams.set('title', listTitle);
        targetUrl.searchParams.set('slug', listSlug);

        // If the parsed target has an origin match (like localhost), we just want pathname + search queries
        // This ensures relative paths (like /huizen/...) retain their query extensions perfectly.
        const redirectPath = targetUrl.origin === 'http://localhost:8000' 
            ? targetUrl.pathname + targetUrl.search 
            : targetUrl.href;

        res.redirect(redirectPath);

    } catch (error) {
        console.error("Error saving house to list:", error);
        res.status(500).send('Server Error: ' + error.message);
    }
});

app.patch('/favorieten/:id', async (req, res) => {
    try {
        const { title, description, icon } = req.body;
        const { id } = req.params;

        const response = await fetch(`${api}f_list/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, icon })
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

app.get('/huizen/:city/:street/:house_slug', loadListsMiddleware, loadHouseMiddleware, (req, res) => {
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

        res.render('overview.liquid', { houses: formattedHouses, title: pageTitle });
    } catch (error) {
        console.error("Error loading hackable list:", error);
        res.status(500).send('Server Error');
    }
});

app.listen(8000, () => console.log('Server started: http://localhost:8000'));