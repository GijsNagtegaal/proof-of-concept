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

// 5. Favorite Link (Optimistic UI)
const favoriteLink = document.querySelector('.js-favorite-link');

if (favoriteLink) {
    favoriteLink.addEventListener('click', function() {
        if (this.classList.contains('is-saved')) {
            this.classList.remove('is-saved');
            this.classList.add('is-unsaved');
        } else {
            this.classList.remove('is-unsaved');
            this.classList.add('is-saved');
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

// 7. List Card Editing
document.addEventListener('click', function(e) {
    const target = e.target.closest('.list-card-main');
    const command = e.target.getAttribute('data-command');
    if (target && command) {
        if (command === '--edit') target.classList.add('editing');
        else if (command === '--cancel') target.classList.remove('editing');
    }
});

// 8. Manage House Lists (Add/Remove)
const manageMultiForm = document.querySelector('.js-manage-lists-form');
if (manageMultiForm) {
    manageMultiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const houseId = manageMultiForm.querySelector('[name="house_id"]')?.value;
        const checkboxes = manageMultiForm.querySelectorAll('[name="list_ids"]');

        const selectedLists = Array.from(manageMultiForm.querySelectorAll('[name="list_ids"]:checked')).map(cb => cb.value);
        const unselectedLists = Array.from(manageMultiForm.querySelectorAll('[name="list_ids"]:not(:checked)')).map(cb => cb.value);
        
        const submitBtn = manageMultiForm.querySelector('button[type="submit"]');
        const originalHtml = submitBtn.innerHTML;

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
                // --- UPDATED REDIRECT LOGIC ---
                const targetUrl = data.redirect_url || window.location.pathname;
                const cleanUrl = targetUrl.replace('/lijsten-beheren', '') || '/';
                window.location.href = cleanUrl;
                // ------------------------------
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