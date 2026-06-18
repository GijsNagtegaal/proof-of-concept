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

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(compression());

const engine = new Liquid();
app.engine('liquid', engine.express());
app.set('views', './views');
app.set('view engine', 'liquid');

// Converts text into a URL-friendly slug.
function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Formats and enriches raw house data with calculated fields, clean slugs, and fallback values.
function enrichHouseData(house) {
    if (!house) return null;

    const rawCity = house.city || 'onbekend';
    const rawStreet = house.street || '';
    const rawNr = house.house_nr ? house.house_nr.toString() : '';

    const cleanStreetNoSpaces = rawStreet.toLowerCase().replace(/\s+/g, '');
    const cleanNrNoSpaces = rawNr.toLowerCase().replace(/\s+/g, '');
    
    const m2Wonen = Number(house.m2) || 0;
    const m2Garden = Number(house.m2_garden) || 0;
    const totalM2 = m2Wonen + m2Garden;
    const price = Number(house.price) || 0;
    const priceM2 = totalM2 > 0 ? Math.ceil(price / totalM2) : 0;

    const hasGarden = m2Garden > 0;
    const hasGarage = house.description ? house.description.toLowerCase().includes('garage') : false;
    const hasParking = house.description ? (house.description.toLowerCase().includes('parkeer') || hasGarage) : false;
    const totalRooms = Number(house.rooms) || 3;
    const bedrooms = totalRooms > 1 ? totalRooms - 1 : 1; 

    const labels = ["A", "B", "C", "D", "E", "F", "G"];
    const randomLabel = labels[Math.floor(Math.random() * labels.length)];

    let posterId = null;
    if (house.poster_image && typeof house.poster_image === 'object' && house.poster_image.id) {
        posterId = house.poster_image.id;
    } else if (typeof house.poster_image === 'string') {
        posterId = house.poster_image;
    }

    const hybridPoster = posterId ? {
        id: posterId,
        toString: function() { return this.id; } 
    } : null;

    let hybridGallery = [];
    if (Array.isArray(house.gallery)) {
        hybridGallery = house.gallery.map(img => {
            let gId = null;
            if (img && typeof img === 'object' && img.directus_files_id) {
                gId = img.directus_files_id;
            } else if (typeof img === 'string') {
                gId = img;
            }
            if (!gId) return null;
            
            return {
                directus_files_id: gId,
                toString: function() { return this.directus_files_id; }
            };
        }).filter(Boolean);
    }

    return {
        ...house,
        poster_image: hybridPoster, 
        gallery: hybridGallery,    
        city_clean: rawCity.toLowerCase().trim().replace(/\s+/g, '-'),
        street_clean: rawStreet.toLowerCase().trim().replace(/\s+/g, '-'),
        slug: `${cleanStreetNoSpaces}${cleanNrNoSpaces}`,
        current_house: `${rawStreet.trim()} ${rawNr.trim()}`.trim(),
        total_m2: totalM2,
        price_m2: priceM2,
        energy_label: house.energy_label || randomLabel, 
        availability: "Beschikbaar",
        agreement: "In overleg",
        construction_year: house.construction_year || 2020,
        house_type: house.house_type || "Middenwoning",
        rooms_detail: `${totalRooms} kamers (${bedrooms} slaapkamers)`,
        bathrooms_detail: "2 badkamers en 1 apart toilet",
        bathroom_features: "2 douches, dubbele wastafel, ligbad, vliering",
        cadastral_id: `${rawCity.toUpperCase()} H 1234`,
        ownership: "Volle eigendom",
        has_garden: hasGarden,
        has_garage: hasGarage,
        has_parking: hasParking
    };
}

// Fetches houses by city via API filter and strictly matches the combined street/number slug in JS.
async function getHouseBySlug(city, slug) {
    const filter = { city: { _icontains: city.replace(/-/g, ' ') } };
    const url = `${api}f_houses?fields=*.*&filter=${encodeURIComponent(JSON.stringify(filter))}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('API fetch failed');
    
    const json = await response.json();
    const houses = json.data || [];

    const targetCity = city.toLowerCase().replace(/\s+/g, '');
    const targetSlug = slug.toLowerCase().replace(/\s+/g, '');

    return houses.find(house => {
        if (!house.street || !house.city) return false;
        const cityClean = house.city.toLowerCase().replace(/\s+/g, '');
        const streetClean = house.street.toLowerCase().replace(/\s+/g, '');
        const nrClean = house.house_nr.toString().toLowerCase().replace(/\s+/g, '');
        return cityClean === targetCity && (streetClean + nrClean) === targetSlug;
    }) || null;
}

// Middleware to fetch all favorite lists and attach them to res.locals.
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

// Middleware to fetch and enrich a specific house by city and slug, handling 404s.
async function loadHouseMiddleware(req, res, next) {
    try {
        const { city, house_slug } = req.params;
        const foundHouse = await getHouseBySlug(city, house_slug);
        
        if (!foundHouse) {
            return res.status(404).render('404.liquid');
        }

        req.house = enrichHouseData(foundHouse);
        next();
    } catch (error) {
        console.error("Error fetching house:", error);
        res.status(500).render('404.liquid'); 
    }
}

// Renders the homepage with all available houses.
app.get('/', async (req, res) => {
    try {
        const response = await fetch(`${api}f_houses?fields=*.*&limit=-1`);
        if (!response.ok) throw new Error('API fetch failed');
        
        const json = await response.json();
        const houses = json.data || [];
        const formattedHouses = houses.map(enrichHouseData);

        res.render('index.liquid', { testje: "Funda", houses: formattedHouses });
    } catch (error) {
        console.error("Error loading houses for index:", error);
        res.status(500).render('404.liquid');
    }
});

// Renders an overview of all favorite lists with their associated enriched houses.
app.get('/favorieten', async (req, res) => {
    try {
        const url = `${api}f_list?fields=*,houses.*,houses.f_houses_id.*,houses.f_houses_id.poster_image.*,houses.f_houses_id.gallery.*`;
        const listResponse = await fetch(url);
        if (!listResponse.ok) throw new Error(`Lists API fetch failed`);
        
        const lists = (await listResponse.json()).data || [];
        const formattedLists = lists.map(list => {
            const enrichedHouses = (list.houses || [])
                .map(item => item.f_houses_id)
                .filter(Boolean)
                .map(house => enrichHouseData(house));

            return { ...list, slug: slugify(list.title), enriched_houses: enrichedHouses };
        });

        res.render('favorite-lists-overview.liquid', { lists: formattedLists });
    } catch (error) {
        console.error("Error loading enriched lists overview:", error);
        res.status(500).render('404.liquid');
    }
});

// Renders the form to create a new favorite list.
app.get('/favorieten/nieuw', async (req, res) => {
    res.render('favorites-new-list.liquid');
});

// Handles the creation of a new favorite list via Directus API.
app.post('/favorieten/nieuw', async (req, res) => {
    try {
        const { title, description, icon } = req.body;
        const response = await fetch(`${api}f_list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, icon: icon || 'house', houses: [], users: [] })
        });

        if (!response.ok) throw new Error('API post failed');
        res.redirect('/favorieten');
    } catch (error) {
        console.error("Error creating new list:", error);
        res.status(500).render('404.liquid');
    }
});

// Renders the view to manage which favorite lists a specific house belongs to.
app.get('/huizen/:city/:street/:house_slug/lijsten-beheren', loadListsMiddleware, loadHouseMiddleware, (req, res) => {
    const houseId = req.house.id;
    const lists = res.locals.lists || [];
    
    const allListsWithStatus = lists.map(list => {
        const housesInList = list.houses || [];
        const isIncluded = housesInList.some(item => 
            item === houseId || item.f_houses_id === houseId || (item.f_houses_id && item.f_houses_id.id === houseId)
        );
        return { ...list, is_included: isIncluded };
    });

    res.render('house-manage-lists.liquid', { house: req.house, all_lists: allListsWithStatus });
});

// Adds or removes a specific house from multiple favorite lists based on form submission.
app.post('/favorieten/lijsten-beheren', async (req, res) => {
    try {
        const { house_id, selected_lists, unselected_lists } = req.body;
        if (!house_id) return res.status(400).json({ success: false, message: 'Missing house_id' });

        const targetHouseId = Number(house_id);
        const listsToAdd = Array.isArray(selected_lists) ? selected_lists : [];
        const listsToRemove = Array.isArray(unselected_lists) ? unselected_lists : [];

        for (const list_id of listsToAdd) {
            const listResponse = await fetch(`${api}f_list/${list_id}?fields=*.*`); 
            if (!listResponse.ok) continue;
            
            const list = (await listResponse.json()).data;
            const targetListId = Number(list_id);
            let currentHouses = (list.houses || []).map(item => {
                const hId = typeof item.f_houses_id === 'object' ? item.f_houses_id.id : item.f_houses_id;
                return { f_list_id: targetListId, f_houses_id: Number(hId), id: item.id };
            });

            if (!currentHouses.some(item => item.f_houses_id === targetHouseId)) {
                currentHouses.push({ f_list_id: targetListId, f_houses_id: targetHouseId });
                await fetch(`${api}f_list/${list_id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ houses: currentHouses })
                });
            }
        }

        for (const list_id of listsToRemove) {
            const listResponse = await fetch(`${api}f_list/${list_id}?fields=*.*`); 
            if (!listResponse.ok) continue;
            
            const list = (await listResponse.json()).data;
            const currentHouses = list.houses || [];
            
            const updatedHouses = currentHouses.filter(item => {
                const hId = typeof item.f_houses_id === 'object' ? item.f_houses_id.id : item.f_houses_id;
                return Number(hId) !== targetHouseId;
            });
            
            if (updatedHouses.length !== currentHouses.length) {
                const houseIds = updatedHouses.map(item => item.id);
                await fetch(`${api}f_list/${list_id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ houses: houseIds })
                });
            }
        }

        res.json({ success: true, active_count: listsToAdd.length });
    } catch (error) {
        console.error("Manage API error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Renders the details and houses of a specific favorite list matched by its slug.
app.get('/favorieten/:list_slug', async (req, res) => {
    try {
        const { list_slug } = req.params;
        const url = `${api}f_list?fields=*,houses.*,houses.f_houses_id.*,houses.f_houses_id.poster_image.*,houses.f_houses_id.gallery.*`;
        
        const listsResponse = await fetch(url);
        if (!listsResponse.ok) throw new Error('API fetch failed');

        const lists = (await listsResponse.json()).data || [];
        const list = lists.find(l => slugify(l.title) === list_slug);

        if (!list) return res.status(404).render('404.liquid');

        const filteredHouses = (list.houses || [])
            .map(item => item.f_houses_id)
            .filter(Boolean)
            .map(house => enrichHouseData(house));

        res.render('favorites-detail.liquid', { list: { ...list, slug: list_slug }, houses: filteredHouses });
    } catch (error) {
        console.error("Error loading specific list details:", error);
        res.status(500).render('404.liquid');
    }
});

// Renders the view to add a specific house to a single favorite list.
app.get('/huizen/:city/:street/:house_slug/huis-toevoegen', loadListsMiddleware, loadHouseMiddleware, (req, res) => {
    res.render('house-add.liquid', { house: req.house, lists: res.locals.lists });
});

// Adds a specific house to a single favorite list and redirects back.
app.post('/favorieten/huis-toevoegen', async (req, res) => {
    try {
        const { house_id, list_id, redirect_back } = req.body;
        if (!house_id || !list_id) throw new Error('Missing house_id or list_id');

        const listResponse = await fetch(`${api}f_list/${list_id}?fields=houses.*,title`); 
        if (!listResponse.ok) throw new Error('Failed to fetch list details');

        const list = (await listResponse.json()).data;
        const targetHouseId = Number(house_id);
        const targetListId = Number(list_id);

        let currentHouses = (list.houses || []).map(item => {
            const hId = typeof item.f_houses_id === 'object' ? item.f_houses_id.id : item.f_houses_id;
            return { f_list_id: targetListId, f_houses_id: Number(hId) };
        });

        if (!currentHouses.some(item => item.f_houses_id === targetHouseId)) {
            currentHouses.push({ f_list_id: targetListId, f_houses_id: targetHouseId });
        }
        
        const updateResponse = await fetch(`${api}f_list/${list_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ houses: currentHouses })
        });

        if (!updateResponse.ok) throw new Error('Failed to save house to list');

        const listTitle = list.title || 'Favorieten';
        const targetUrl = new URL(redirect_back || req.headers.referer || '/favorieten', 'http://localhost:8000'); 
        targetUrl.searchParams.set('success', 'true');
        targetUrl.searchParams.set('title', listTitle);
        targetUrl.searchParams.set('slug', slugify(listTitle));

        res.redirect(targetUrl.origin === 'http://localhost:8000' ? targetUrl.pathname + targetUrl.search : targetUrl.href);
    } catch (error) {
        console.error("Error saving house to list:", error);
        res.status(500).render('404.liquid'); 
    }
});

// Renders the photo gallery view for a specific house.
app.get('/huizen/:city/:street/:house_slug/media/fotos', loadHouseMiddleware, (req, res) => {
    res.render('house-media.liquid', { house: req.house });
});

// Renders the detail page for a specific house and checks its saved status.
app.get('/huizen/:city/:street/:house_slug', loadListsMiddleware, loadHouseMiddleware, (req, res) => {
    const houseId = req.house.id;
    const lists = res.locals.lists || [];
    let isSaved = false;
    let savedListId = null;

    for (const list of lists) {
        const housesInList = list.houses || [];
        const found = housesInList.some(item => 
            item === houseId || item.f_houses_id === houseId || (item.f_houses_id && item.f_houses_id.id === houseId)
        );

        if (found) {
            isSaved = true;
            savedListId = list.id;
            break; 
        }
    }

    req.house.savestate = isSaved ? 'saved' : 'unsaved';
    req.house.saved_list_id = savedListId;

    res.render('house-detail.liquid', { house: req.house, lists: res.locals.lists });
});

// Renders an overview of houses, dynamically filtered by city and street via API and JS.
app.get(['/huizen', '/huizen/:city', '/huizen/:city/:street'], async (req, res) => {
    try {
        const filterObj = {};

        if (req.params.city) filterObj.city = { _icontains: req.params.city.replace(/-/g, ' ') };
        if (req.params.street) filterObj.street = { _icontains: req.params.street.replace(/-/g, ' ') };

        let url = `${api}f_houses?fields=*.*`;
        
        if (Object.keys(filterObj).length > 0) {
            url += `&filter=${encodeURIComponent(JSON.stringify(filterObj))}`;
        } else {
            url += `&limit=-1`; 
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('API fetch failed');
        
        let houses = (await response.json()).data || [];

        if (req.params.city) {
            const targetCity = req.params.city.toLowerCase().trim();
            houses = houses.filter(h => h.city && h.city.toLowerCase().trim() === targetCity);
        }

        if (req.params.street) {
            const targetStreet = req.params.street.toLowerCase().trim();
            houses = houses.filter(h => h.street && h.street.toLowerCase().trim() === targetStreet);
        }

        const formattedHouses = houses.map(enrichHouseData);

        let pageTitle = "Alle beschikbare huizen";
        if (req.params.street) pageTitle = `Huizen in de ${req.params.street} (${req.params.city})`;
        else if (req.params.city) pageTitle = `Huizen in ${req.params.city}`;

        res.render('overview.liquid', { houses: formattedHouses, title: pageTitle });
    } catch (error) {
        console.error("Error loading hackable list:", error);
        res.status(500).render('404.liquid'); 
    }
});

// Global 404 handler for undefined routes.
app.use((req, res, next) => {
    res.status(404).render('404.liquid');
});

// Global error handler for uncaught exceptions.
app.use((err, req, res, next) => {
    console.error("Global Server Error:", err.stack);
    res.status(500).render('404.liquid');
});

app.listen(8000, () => console.log('Server started: http://localhost:8000'));