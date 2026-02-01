class AnimalsManager {
    constructor() { this.currentAnimalId = null; this.currentPhotoBase64 = null; }
    init() { this.bindEvents(); }
    bindEvents() {
        document.getElementById('add-animal-btn')?.addEventListener('click', () => this.openAnimalModal());
        const f = document.getElementById('animal-form');
        if (f) f.addEventListener('submit', async (e) => { e.preventDefault(); await this.saveAnimal(); });
        document.getElementById('animal-photo')?.addEventListener('change', e => this.handlePhotoUpload(e));
        document.getElementById('animal-search')?.addEventListener('input', () => this.applyFilters());
    }
    async loadAnimals() { const a = await db.getAnimals(); this.renderAnimalsTable(a); }
    renderAnimalsTable(animals) {
        const c = document.querySelector('#animals .table-container');
        if (!c) return;
        let h = '<div class="animals-list-container">';
        if (!animals || animals.length === 0) h += '<p style="text-align:center;padding:2rem;">Nenhum pet.</p>';
        else {
            animals.forEach(a => {
                h += `<div class="animal-list-item">
                    <div class="animal-item-header" onclick="this.parentElement.classList.toggle('expanded')">
                        <div class="animal-basic-info"><strong>${a.name}</strong><span>${a.species}</span></div>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="animal-item-details">
                        <p>Tutor: ${a.tutor_name}</p>
                        <div class="animal-item-actions">
                            <button class="btn btn-secondary" onclick="window.animalsManager.editAnimal(${a.id})">Editar</button>
                            <button class="btn btn-danger" onclick="window.animalsManager.deleteAnimal(${a.id})">Excluir</button>
                        </div>
                    </div>
                </div>`;
            });
        }
        c.innerHTML = h + '</div>';
    }
    async saveAnimal() {
        const n = document.getElementById('animal-name').value;
        const t = document.getElementById('tutor-name').value;
        if (!n || !t) return;
        const data = { name: n.toUpperCase(), species: document.getElementById('animal-species').value, tutor_name: t.toUpperCase(), tutor_phone: document.getElementById('tutor-phone').value, photo_url: this.currentPhotoBase64 };
        if (this.currentAnimalId) await db.updateAnimal(this.currentAnimalId, data);
        else await db.addAnimal(data);
        window.hotelPetApp.closeAllModals();
        await this.loadAnimals();
    }
    handlePhotoUpload(e) {
        const f = e.target.files[0];
        const r = new FileReader();
        r.onload = ev => { this.currentPhotoBase64 = ev.target.result; document.getElementById('photo-preview').src = ev.target.result; document.getElementById('photo-preview').style.display='block'; document.getElementById('photo-placeholder').style.display='none'; };
        r.readAsDataURL(f);
    }
    openAnimalModal(id=null) { 
        this.currentAnimalId=id; 
        document.getElementById('animal-form').reset(); 
        document.getElementById('photo-preview').style.display='none';
        document.getElementById('photo-placeholder').style.display='flex';
        document.getElementById('animal-modal').classList.add('active'); 
    }
    editAnimal(id) { this.openAnimalModal(id); }
    async deleteAnimal(id) { if (confirm('Excluir?')) { await db.deleteAnimal(id); await this.loadAnimals(); } }
    applyFilters() { db.getAnimals(document.getElementById('animal-search').value).then(a => this.renderAnimalsTable(a)); }
}