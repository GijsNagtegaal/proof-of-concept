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
