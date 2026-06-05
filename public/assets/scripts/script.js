let notificationTimer = null;

const phoneLink = document.getElementById('phone-reveal-link');

if (phoneLink) {
    phoneLink.classList.add('js-enabled');
    phoneLink.setAttribute('data-revealed', 'false');

    phoneLink.addEventListener('click', function(event) {
        const isRevealed = this.getAttribute('data-revealed') === 'true';

        if (!isRevealed) {
            event.preventDefault(); 
            this.classList.remove('js-enabled');
            this.setAttribute('data-revealed', 'true');
        }
    });
}

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
        
        if (isCollapsed) {
            excerptContent.style.display = 'none';
            fullContent.style.display = 'block';

            const btnText = toggleBtn.querySelector('.btn-text');
            const iconPlus = toggleBtn.querySelector('.icon-plus');
            if (btnText) btnText.textContent = 'Minder weergeven';
            if (iconPlus) iconPlus.style.transform = 'rotate(45deg)';
        } else {
            fullContent.style.display = 'none';
            excerptContent.style.display = 'block';
            
            const btnText = toggleBtn.querySelector('.btn-text');
            const iconPlus = toggleBtn.querySelector('.icon-plus');
            if (btnText) btnText.textContent = 'Lees de volledige omschrijving';
            if (iconPlus) iconPlus.style.transform = 'rotate(0deg)';

            excerptContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}


(() => {
    try {
        const skeletonImages = document.querySelectorAll(".funda-skeleton-wrapper img");
        if (!skeletonImages || skeletonImages.length === 0) return;

        const hideSkeleton = (img) => {
            if (img && img.parentElement) {
                img.parentElement.setAttribute("data-loading", "false");
            }
        };

        skeletonImages.forEach((img) => {
            if (!img) return;

            if (img.complete && img.naturalWidth > 0) {
                return; 
            }

            if (img.parentElement) {
                img.parentElement.setAttribute("data-loading", "true");
            }

            const options = { once: true };
            const handleLoad = () => hideSkeleton(img);
            const handleError = () => hideSkeleton(img);

            img.addEventListener("load", handleLoad, options);
            img.addEventListener("error", handleError, options);

            setTimeout(() => {
                img.removeEventListener("load", handleLoad);
                img.removeEventListener("error", handleError);
                hideSkeleton(img);
            }, 5000); 
        });
    } catch (error) {
        console.error("Skeleton tracker failed safely:", error);
    }
})();

const form = document.querySelector('form[action="/favorieten/opslaan"]');
const submitBtn = form ? form.querySelector('.btn-submit-save') : null;
const messageZone = document.querySelector('.message-notification'); 

if (form && submitBtn && messageZone) {
    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const selectedRadio = form.querySelector('input[name="list_id"]:checked');
        if (!selectedRadio) return;

        const listTitle = selectedRadio.closest('.option-row')
            .querySelector('span')
            .textContent.replace(/\s*\(\d+\)$/, '');

        clearTimeout(notificationTimer);
        messageZone.setAttribute('hidden', '');
        messageZone.innerHTML = '';

        submitBtn.disabled = true;
        submitBtn.classList.add('btn-loading');
        
        const originalText = submitBtn.innerText;
        submitBtn.innerHTML = `
            <span class="btn-loading-text">Laden</span>
            <span class="btn-spinner"></span>
        `;

        const formData = new FormData(form);
        const searchParams = new URLSearchParams(formData);

        fetch(form.action, {
            method: 'POST',
            body: searchParams,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Server error');
            return response.text();
        })
        .then(() => {
            function slugifyText(text) {
                return text.toString().toLowerCase().trim()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w\-]+/g, '')
                    .replace(/\-\-+/g, '-');
            }

            const computedSlug = slugifyText(listTitle);
            const generatedListUrl = `/favorieten/${computedSlug}`;

            messageZone.innerHTML = `
                Dit huis is toegevoegd aan het lijstje <strong>${listTitle}</strong>. 
                <a href="${generatedListUrl}">Bekijk lijst</a>
            `;
            
            messageZone.removeAttribute('hidden');

            notificationTimer = setTimeout(() => {
                messageZone.setAttribute('hidden', '');
                messageZone.innerHTML = '';
            }, 5000);

            if (typeof form.closest('[popover]').hidePopover === 'function') {
                form.closest('[popover]').hidePopover();
            }
        })
        .catch(() => {
            messageZone.innerHTML = `Er ging iets mis bij het opslaan.`;
            messageZone.removeAttribute('hidden');
            
            notificationTimer = setTimeout(() => {
                messageZone.setAttribute('hidden', '');
                messageZone.innerHTML = '';
            }, 5000);
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.classList.remove('btn-loading');
            submitBtn.innerText = originalText;
        });
    });
}