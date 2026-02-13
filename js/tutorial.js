class TutorialManager {
    constructor() {
        this.currentSlide = 0;
        this.totalSlides = 4;
        this.storageKey = 'hotelPetTutorialCompleted';
        this.init();
    }

    init() {
        const skipBtn = document.getElementById('skip-tutorial');
        const nextBtn = document.getElementById('next-slide');

        if (skipBtn) skipBtn.onclick = () => this.finishTutorial();
        if (nextBtn) nextBtn.onclick = () => this.nextSlide();

        // Pequeno delay para a animação inicial de loading terminar (Premium Timing)
        const completed = localStorage.getItem(this.storageKey);
        if (!completed) {
            setTimeout(() => this.showTutorial(), 5500);
        }
    }

    showTutorial() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.add('active');
            this.updateSlidePosition();
        }
    }

    nextSlide() {
        if (this.currentSlide < this.totalSlides - 1) {
            this.currentSlide++;
            this.updateSlidePosition();
        } else {
            this.finishTutorial();
        }
    }

    updateSlidePosition() {
        const container = document.querySelector('.tutorial-slides');
        const dots = document.querySelectorAll('.tutorial-dot');
        const nextBtn = document.getElementById('next-slide');

        if (container) {
            container.style.transform = `translateX(-${this.currentSlide * 100}%)`;
        }

        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentSlide);
        });

        if (nextBtn) {
            nextBtn.textContent = this.currentSlide === this.totalSlides - 1 ? 'Começar Agora!' : 'Próximo';
        }
    }

    finishTutorial() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            localStorage.setItem(this.storageKey, 'true');
            window.hotelPetApp?.showNotification('Bem-vindo ao Hotel Pet CÁ!', 'success');
        }
    }

    restartTutorial() {
        this.currentSlide = 0;
        this.showTutorial();
    }
}

window.tutorialManager = new TutorialManager();
