// 1. Reveal hidden phone numbers on click
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

// 2. Toggle between short and full description text
const toggleButton = document.querySelector('.description-toggle-btn');
const excerptContent = document.querySelector('.excerpt-text');
const fullContent = document.querySelector('.full-text');

if (toggleButton && excerptContent && fullContent) {
    excerptContent.style.display = 'block';
    fullContent.style.display = 'none';
    toggleButton.removeAttribute('hidden');
    toggleButton.classList.add('js-enabled');
    
    toggleButton.addEventListener('click', function () {
        const isCollapsed = fullContent.style.display === 'none';
        excerptContent.style.display = isCollapsed ? 'none' : 'block';
        fullContent.style.display = isCollapsed ? 'block' : 'none';
        
        const buttonText = toggleButton.querySelector('.btn-text');
        const iconPlus = toggleButton.querySelector('.icon-plus');
        
        if (buttonText) {
            buttonText.textContent = isCollapsed ? 'Minder weergeven' : 'Lees de volledige omschrijving';
        }
        if (iconPlus) {
            iconPlus.style.transform = isCollapsed ? 'rotate(45deg)' : 'rotate(0deg)';
        }
        if (!isCollapsed) {
            excerptContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}

// 3. Hide loading skeletons when images finish loading natively
const skeletonImages = document.querySelectorAll(".funda-skeleton-wrapper img");
if (skeletonImages.length > 0) {
    skeletonImages.forEach(function(image) {
        if (image.complete && image.naturalWidth > 0) {
            return;
        }
        if (image.parentElement) {
            image.parentElement.setAttribute("data-loading", "true");
        }
        
        const hideSkeleton = function() {
            if (image.parentElement) {
                image.parentElement.setAttribute("data-loading", "false");
            }
        };
        
        image.addEventListener("load", hideSkeleton, { once: true });
        image.addEventListener("error", hideSkeleton, { once: true });
        setTimeout(hideSkeleton, 5000);
    });
}

// 4. Display temporary success message from URL parameters
const urlParameters = new URLSearchParams(window.location.search);
const messageZone = document.getElementById('status-message-zone');
const listLink = document.getElementById('status-list-link');

if (urlParameters.get('success') === 'true' && messageZone && listLink) {

    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

    const listTitle = urlParameters.get('title') ? decodeURIComponent(urlParameters.get('title')) : 'je lijst';
    const listUrl = urlParameters.get('slug') ? `/favorieten/${urlParameters.get('slug')}` : '/favorieten';

    listLink.href = listUrl;
    
    const strongTag = listLink.querySelector('strong');
    if (strongTag) {
        strongTag.textContent = listTitle;
    }
    
    messageZone.removeAttribute('hidden');
    
    setTimeout(function() { 
        messageZone.setAttribute('hidden', ''); 
    }, 5000);
}

// 5. Toggle favorite button styling optimistically
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

// 6. Show loading state on form submission
const formElement = document.querySelector('form[action="/favorieten/lijsten-beheren"]');
const submitButtonForm = document.querySelector('.btn-submit-save');

if (formElement && submitButtonForm) {
    formElement.addEventListener('submit', function() {
        submitButtonForm.disabled = true;
        submitButtonForm.classList.add('btn-loading');
        submitButtonForm.innerHTML = `<span class="btn-loading-text">Laden</span><span class="btn-spinner"></span>`;
    });
}

// 8. Handle adding or removing a house from multiple lists via API
const manageMultipleListsForm = document.querySelector('.js-manage-lists-form');

if (manageMultipleListsForm) {
    const listCheckboxes = manageMultipleListsForm.querySelectorAll('[name="list_ids"]');
    const submitButton = manageMultipleListsForm.querySelector('button[type="submit"]');
    const defaultButtonHtmlContent = submitButton.innerHTML;

    const updateButtonUserInterface = function() {
        const selectedCount = manageMultipleListsForm.querySelectorAll('[name="list_ids"]:checked').length;
        
        if (selectedCount === 0) {
            submitButton.classList.add('delete-all');
            submitButton.innerHTML = `Huis verwijderen van alle lijstjes`;
        } else {
            submitButton.classList.remove('delete-all');
            submitButton.innerHTML = defaultButtonHtmlContent;
        }
    };

    listCheckboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', updateButtonUserInterface);
    });

    updateButtonUserInterface();

    manageMultipleListsForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const houseIdentifier = manageMultipleListsForm.querySelector('[name="house_id"]')?.value;
        const selectedListsArray = Array.from(manageMultipleListsForm.querySelectorAll('[name="list_ids"]:checked')).map(function(checkbox) {
            return checkbox.value;
        });
        const unselectedListsArray = Array.from(manageMultipleListsForm.querySelectorAll('[name="list_ids"]:not(:checked)')).map(function(checkbox) {
            return checkbox.value;
        });
        
        submitButton.disabled = true;
        submitButton.classList.add('btn-loading');
        
        listCheckboxes.forEach(function(checkbox) {
            checkbox.disabled = true;
        });

        if (selectedListsArray.length === 0) {
            submitButton.innerHTML = `<span class="btn-loading-text">Huis verwijderen van alle lijstjes</span><span class="btn-spinner"></span>`;
        } else {
            submitButton.innerHTML = `<span class="btn-loading-text">Bijwerken...</span><span class="btn-spinner"></span>`;
        }
        
        try {
            const serverResponse = await fetch('/favorieten/lijsten-beheren', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    house_id: houseIdentifier, 
                    selected_lists: selectedListsArray,
                    unselected_lists: unselectedListsArray
                })
            });
            
            const responseData = await serverResponse.json();

            if (serverResponse.ok && responseData.success) {
                const targetUrl = responseData.redirect_url || window.location.pathname;
                const cleanRedirectUrl = targetUrl.replace('/lijsten-beheren', '') || '/';
                const redirectUrl = new URL(cleanRedirectUrl, window.location.origin);

                redirectUrl.searchParams.set('success', 'true');

                if (responseData.title) redirectUrl.searchParams.set('title', responseData.title);
                if (responseData.slug) redirectUrl.searchParams.set('slug', responseData.slug);

                window.location.href = redirectUrl.toString();
            } else {
                throw new Error('Server returned an error');
            }
        } catch (error) {
            console.error('Update error:', error);
            
            submitButton.classList.remove('btn-loading');
            submitButton.disabled = false;
            
            listCheckboxes.forEach(function(checkbox) {
                checkbox.disabled = false;
            });
            
            updateButtonUserInterface(); 
            
            alert('Fout bij het bijwerken van lijsten. Probeer opnieuw.');
        }
    });
}