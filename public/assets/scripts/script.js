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
            if (img.complete && img.naturalWidth > 0) return; 
            if (img.parentElement) img.parentElement.setAttribute("data-loading", "true");

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

const form = document.querySelector('form[action="/favorieten/huis-toevoegen"]');
const submitBtn = document.querySelector('.btn-submit-save');

if (form && submitBtn) {
    form.addEventListener('submit', function() {

        submitBtn.disabled = true;
        submitBtn.classList.add('btn-loading');
        submitBtn.innerHTML = `
            <span class="btn-loading-text">Laden</span>
            <span class="btn-spinner"></span>
        `;
    });
}

document.addEventListener("DOMContentLoaded", function() {
    const messageZone = document.querySelector('.message-notification');
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success') === 'true';
    const listTitle = urlParams.get('title');
    const listSlug = urlParams.get('slug');

    if (isSuccess && messageZone) {

        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

        const listUrl = listSlug ? `/favorieten/${listSlug}` : '/favorieten';

        messageZone.innerHTML = `Dit huis is toegevoegd aan het lijstje <a href="${listUrl}"><strong>${decodeURIComponent(listTitle)}</strong></a>.`;
        messageZone.removeAttribute('hidden');

        setTimeout(() => {
            messageZone.setAttribute('hidden', '');
            messageZone.innerHTML = '';
        }, 5000);
    }
});