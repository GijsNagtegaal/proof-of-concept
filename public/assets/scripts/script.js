// phone number show
const phoneLink = document.getElementById('phone-reveal-link');

if (phoneLink) {
    phoneLink.addEventListener('click', function(event) {
        const isRevealed = this.getAttribute('data-revealed') === 'true';

        if (!isRevealed) {
            event.preventDefault(); 

            const placeholder = this.querySelector('.placeholder-text');
            const actualNumber = this.querySelector('.actual-number');

            if (placeholder) placeholder.style.display = 'none';
            if (actualNumber) actualNumber.style.display = 'inline';
            
            this.setAttribute('data-revealed', 'true');
        }
    });
}

// product description
const toggleBtn = document.querySelector('.description-toggle-btn');
const excerptContent = document.querySelector('.excerpt-text');
const fullContent = document.querySelector('.full-text');

if (toggleBtn && excerptContent && fullContent) {
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