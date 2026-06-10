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

// 4. Success Notifications
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

// 5. Remove/Add Favorite Buttons
const removeBtn = document.querySelector('.js-remove-favorite');
const addLink = document.querySelector('.js-add-favorite-link');
const statusZone = document.getElementById('status-message-zone');

if (removeBtn) {
    removeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const textSpan = removeBtn.querySelector('.btn-text');
        const originalText = textSpan.textContent;
        
        removeBtn.style.opacity = '0.5';
        removeBtn.style.pointerEvents = 'none';
        textSpan.textContent = 'Verwijderen...';
        
        try {
            const res = await fetch('/favorieten/verwijderen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ house_id: removeBtn.dataset.houseId, list_id: removeBtn.dataset.listId })
            });

            if (res.ok) {
                // FORCE HIDE using display none
                removeBtn.style.display = 'none';
                removeBtn.setAttribute('hidden', '');
                
                // FORCE SHOW by clearing display style and removing hidden attribute
                if (addLink) {
                    addLink.style.display = ''; 
                    addLink.removeAttribute('hidden');
                }
                
                if (statusZone) {
                    statusZone.textContent = 'Huis is verwijderd uit je lijst.';
                    statusZone.style.display = 'block';
                    setTimeout(() => statusZone.style.display = 'none', 4000);
                }
            }
        } catch (err) { console.error(err); }
        
        removeBtn.style.opacity = '1';
        removeBtn.style.pointerEvents = 'auto';
        textSpan.textContent = originalText;
    });
}

// 6. Form Loading
const form = document.querySelector('form[action="/favorieten/huis-toevoegen"]');
const submitBtn = document.querySelector('.btn-submit-save');
if (form && submitBtn) {
    form.addEventListener('submit', function() {
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-loading');
        submitBtn.innerHTML = `<span class="btn-loading-text">Laden</span><span class="btn-spinner"></span>`;
    });
}

// 7. List Card Editing
document.addEventListener('click', function(e) {
    const target = e.target.closest('.list-card-main');
    const command = e.target.getAttribute('data-command');
    if (target && command) {
        if (command === '--edit') target.classList.add('editing');
        else if (command === '--cancel') target.classList.remove('editing');
    }
});