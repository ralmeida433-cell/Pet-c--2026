// Sincronizado para APK
class AnimalsManager {
    constructor() { this.currentAnimalId = null; this.currentPhotoBase64 = null; this.init(); }
    init() { document.addEventListener('DOMContentLoaded', () => this.bindEvents()); }
    bindEvents() {
        const f = document.getElementById('animal-form');
        if (f) f.onsubmit = async (e) => { e.preventDefault(); await this.saveAnimal(); };
        document.getElementById('add-animal-btn')?.onclick = () => this.openAnimalModal();
        document.getElementById('cancel-animal')?.onclick = () => this.closeAnimalModal();
        document.getElementById('animal-photo')?.onchange = e => this.handlePhotoUpload(e);
        document.getElementById('animal-search')?.oninput = () => this.applyFilters();
    }
    async loadAnimals() { const a = await db.getAnimals(); this.renderAnimalsTable(a); }
    renderAnimalsTable(animals) {
        const c = document.querySelector('#animals .table-container');
        if (!c) return;
        let h = '<div class="animals-list-container">';
        animals.forEach(a => {
            h += `<div class="animal-list-item" onclick="this.classList.toggle('expanded')">
                <div class="animal-item-header">
                    <div class="animal-item-summary">
                        <img src="${a.photo_url || ''}" style="width:40px;height:40px;border-radius:50%">
                        <strong>${a.name}</strong>
                    </div>
                </div>
                <div class="animal-item-details"><p>Tutor: ${a.tutor_name}</p>
                <button onclick="event.stopPropagation(); animalsManager.editAnimal(${a.id})">Editar</button></div>
            </div>`;
        });
        c.innerHTML = h + '</div>';
    }
    async saveAnimal() {
        const n = document.getElementById('animal-name').value;
        const t = document.getElementById('tutor-name').value;
        if (!n || !t) return alert('Preencha os campos');
        let photo = this.currentPhotoBase64;
        if (photo && window.storageService) photo = await window.storageService.saveImage(photo);
        const data = { name: n.toUpperCase(), species: document.getElementById('animal-species').value, tutor_name: t.toUpperCase(), tutor_phone: document.getElementById('tutor-phone').value, photo_url: photo };
        if (this.currentAnimalId) await db.updateAnimal(this.currentAnimalId, data);
        else await db.addAnimal(data);
        this.closeAnimalModal(); await this.loadAnimals();
    }
    handlePhotoUpload(e) {
        const f = e.target.files[0];
        const r = new FileReader();
        r.onload = ev => { this.currentPhotoBase64 = ev.target.result; document.getElementById('photo-preview').src = ev.target.result; document.getElementById('photo-preview').style.display='block'; };
        r.readAsDataURL(f);
    }
    openAnimalModal(id=null) { this.currentAnimalId=id; document.getElementById('animal-modal').classList.add('active'); }
    closeAnimalModal() { document.getElementById('animal-modal').classList.remove('active'); }
    editAnimal(id) { this.openAnimalModal(id); }
    applyFilters() { db.getAnimals(document.getElementById('animal-search').value).then(a => this.renderAnimalsTable(a)); }
}
window.animalsManager = new AnimalsManager();