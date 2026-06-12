// 1. Phone Reveal
const phoneLink = document.getElementById('phone-reveal-link');
if (phoneLink) {
    phoneLink.classList.add('js-enabled');
    phoneLink.setAttribute('data-revealed', 'false');
    phoneLink.addEventListener('click', function(event) {
        if (this.getAttribute('data-revealed') === 'false') {
            event.preventDefault();
            this.classList.remove('js-enabled');
            this.setAttribute('data-revealed', 'true');
        }
    });
}

// 2. Description Toggle
const toggleBtn = document.querySelector('.description-toggle-btn');
const excerptContent = document.querySelector('.excerpt-text');
const fullContent = document.querySelector('.full-text');
if (toggleBtn && excerptContent && fullContent) {
    excerptContent.style.display = 'block';
    fullContent.style.display = 'none';
    toggleBtn.removeAttribute('hidden');
    toggleBtn.classList.add('js-enabled');
    toggleBtn.addEventListener('click', function () {
        const isCollapsed = fullContent.style.display === 'none';
        excerptContent.style.display = isCollapsed ? 'none' : 'block';
        fullContent.style.display = isCollapsed ? 'block' : 'none';
        const btnText = toggleBtn.querySelector('.btn-text');
        const iconPlus = toggleBtn.querySelector('.icon-plus');
        if (btnText) btnText.textContent = isCollapsed ? 'Minder weergeven' : 'Lees de volledige omschrijving';
        if (iconPlus) iconPlus.style.transform = isCollapsed ? 'rotate(45deg)' : 'rotate(0deg)';
        if (!isCollapsed) excerptContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}

// 3. Skeleton Tracker
const skeletonImages = document.querySelectorAll(".funda-skeleton-wrapper img");
if (skeletonImages.length > 0) {
    skeletonImages.forEach((img) => {
        if (img.complete && img.naturalWidth > 0) return;
        if (img.parentElement) img.parentElement.setAttribute("data-loading", "true");
        const hide = () => img.parentElement && img.parentElement.setAttribute("data-loading", "false");
        img.addEventListener("load", hide, { once: true });
        img.addEventListener("error", hide, { once: true });
        setTimeout(hide, 5000);
    });
}

// 4-. Success Notifications
const urlParams = new URLSearchParams(window.location.search);
const messageZone = document.querySelector('.message-notification');
if (urlParams.get('success') === 'true' && messageZone) {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    const listTitle = decodeURIComponent(urlParams.get('title') || 'je lijst');
    const listUrl = urlParams.get('slug') ? `/favorieten/${urlParams.get('slug')}` : '/favorieten';
    messageZone.innerHTML = `Dit huis is toegevoegd aan het lijstje <a href="${listUrl}"><strong>${listTitle}</strong></a>.`;
    messageZone.removeAttribute('hidden');
    setTimeout(() => { messageZone.setAttribute('hidden', ''); messageZone.innerHTML = ''; }, 5000);
}

// 5-. Remove/Add Favorite Form
const favoriteForm = document.querySelector('.js-remove-favorite-form');
const removeBtn = document.querySelector('.js-remove-favorite');
const addLink = document.querySelector('.js-add-favorite-link');
const statusZone = document.getElementById('status-message-zone');

function getSaveKey(houseId) {
    return `house_saved_${houseId}`;
}

function initFavoriteState() {
    if (!favoriteForm || !removeBtn || !addLink) return;
    const houseId = favoriteForm.querySelector('[name="house_id"]')?.value;
    if (!houseId) return;
    const saveKey = getSaveKey(houseId);
    const storedState = localStorage.getItem(saveKey);
    let isSaved;
    
    if (storedState !== null) {
        isSaved = storedState === 'true';
    } else {
        const initialState = favoriteForm.getAttribute('data-initial-saved');
        isSaved = initialState === 'saved';
    }
    
    if (isSaved) {
        favoriteForm.style.display = '';
        addLink.style.display = 'none';
    } else {
        favoriteForm.style.display = 'none';
        addLink.style.display = '';
    }
}

if (favoriteForm && removeBtn) {
    // Form now uses GET to navigate to remove page, so just ensure UI shows correctly on load
    initFavoriteState();
}

if (addLink) {
    const originalHref = addLink.href;
    addLink.addEventListener('click', function(e) {
        const houseId = favoriteForm?.querySelector('[name="house_id"]')?.value;
        if (houseId) {
            const saveKey = getSaveKey(houseId);
            localStorage.setItem(saveKey, 'true');
            setTimeout(() => {
                favoriteForm.style.display = '';
                addLink.style.display = 'none';
            }, 100);
        }
    });
}

// 6. Form Loading
const form = document.querySelector('form[action="/favorieten/lijsten-beheren"]');
const submitBtn = document.querySelector('.btn-submit-save');
if (form && submitBtn) {
    form.addEventListener('submit', function() {
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-loading');
        submitBtn.innerHTML = `<span class="btn-loading-text">Laden</span><span class="btn-spinner"></span>`;
    });
}

// 7-. List Card Editing
document.addEventListener('click', function(e) {
    const target = e.target.closest('.list-card-main');
    const command = e.target.getAttribute('data-command');
    if (target && command) {
        if (command === '--edit') target.classList.add('editing');
        else if (command === '--cancel') target.classList.remove('editing');
    }
});

// 8-. Manage House Lists (Add/Remove)
const manageMultiForm = document.querySelector('.js-manage-lists-form');
if (manageMultiForm) {
    manageMultiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const houseId = manageMultiForm.querySelector('[name="house_id"]')?.value;
        const checkboxes = manageMultiForm.querySelectorAll('[name="list_ids"]');
        
        // Grab both checked and unchecked lists
        const selectedLists = Array.from(manageMultiForm.querySelectorAll('[name="list_ids"]:checked')).map(cb => cb.value);
        const unselectedLists = Array.from(manageMultiForm.querySelectorAll('[name="list_ids"]:not(:checked)')).map(cb => cb.value);
        
        const submitBtn = manageMultiForm.querySelector('button[type="submit"]');
        const originalHtml = submitBtn.innerHTML;
        
        // Set loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-loading');
        submitBtn.innerHTML = `<span class="btn-loading-text">Bijwerken...</span><span class="btn-spinner"></span>`;
        checkboxes.forEach(cb => cb.disabled = true);
        
        try {
            const res = await fetch('/favorieten/lijsten-beheren', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    house_id: houseId, 
                    selected_lists: selectedLists,
                    unselected_lists: unselectedLists
                })
            });
            
            const data = await res.json();

            if (res.ok && data.success) {
                // Update LocalStorage based on whether it is saved to ANY list
                const saveKey = `house_saved_${houseId}`;
                if (data.active_count === 0) {
                    localStorage.removeItem(saveKey);
                } else {
                    localStorage.setItem(saveKey, 'true');
                }
                
                // Redirect back to house detail page
                const urlParts = window.location.pathname.split('/');
                const city = urlParts[2];
                const street = urlParts[3];
                const slug = urlParts[4];
                window.location.href = `/huizen/${city}/${street}/${slug}`;
            } else {
                throw new Error('Server returned an error');
            }
        } catch (err) {
            console.error('Update error:', err);
            submitBtn.classList.remove('btn-loading');
            submitBtn.innerHTML = originalHtml;
            submitBtn.disabled = false;
            checkboxes.forEach(cb => cb.disabled = false);
            alert('Fout bij het bijwerken van lijsten. Probeer opnieuw.');
        }
    });
}