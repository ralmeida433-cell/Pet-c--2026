class AnimalsManager {
    constructor() {
        this.currentAnimalId = null;
        this.currentPhotoBase64 = null;
        this.init();
    }
    init() {
        document.addEventListener('DOMContentLoaded', () => this.bindEvents());
    }
    bindEvents() {
        const form = document.getElementById('animal-form');
        if (form) form.onsubmit = async (e) => { e.preventDefault(); await this.saveAnimal(); };
        document.getElementById('add-animal-btn')?.addEventListener('click', () => this.openAnimalModal());
        document.getElementById('cancel-animal')?.addEventListener('click', () => this.closeAnimalModal());
        document.getElementById('animal-photo')?.addEventListener('change', e => this.handlePhotoUpload(e));
        document.getElementById('animal-search')?.addEventListener('input', () => this.applyFilters());
    }
    async loadAnimals() {
        const a = await db.getAnimals();
        this.renderAnimalsTable(a);
    }
    renderAnimalsTable(animals) {
        const c = document.querySelector('#animals .table-container');
        if (!c) return;
        const localPlaceholder = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path fill='%23cbd5e0' d='M256 160c12.9 0 24.7 3.9 34.2 10.5l5.8-14.8C311 118.6 285.2 96 256 96s-55 22.6-40 59.7l5.8 14.8c9.5-6.6 21.3-10.5 34.2-10.5zm-112 80c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm224 0c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zM256 320c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-30z'/></svg>`;
        let h = '<div class="animals-list-container">';
        if (animals.length === 0) h += '<p style="text-align:center;padding:2rem;">Nenhum pet.</p>';
        else {
            animals.forEach(a => {
                h += `<div class="animal-list-item">
                    <div class="animal-item-header" onclick="this.parentElement.classList.toggle('expanded')">
                        <div class="animal-item-summary">
                            <div class="animal-thumb"><img src="${a.photo_url || localPlaceholder}" onerror="this.src='${localPlaceholder}'"></div>
                            <div class="animal-basic-info"><strong>${a.name}</strong><span>${a.species}</span></div>
                        </div>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="animal-item-details">
                        <p>Tutor: ${a.tutor_name}</p><p>Fone: ${a.tutor_phone}</p>
                        <div class="animal-item-actions">
                            <button class="btn btn-sm btn-secondary" onclick="animalsManager.editAnimal(${a.id})">Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="animalsManager.deleteAnimal(${a.id})">Excluir</button>
                        </div>
                    </div>
                </div>`;
            });
        }
        c.innerHTML = h + '</div>';
    }
    async saveAnimal() {
        try {
            const n = document.getElementById('animal-name').value;
            const t = document.getElementById('tutor-name').value;
            if (!n || !t) return alert('Preencha os campos!');
            window.hotelPetApp?.showLoading();
            let photo = this.currentPhotoBase64;
            if (photo && photo.startsWith('data:image') && window.storageService) {
                photo = await window.storageService.saveImage(photo);
            }
            const data = { name: n.toUpperCase().trim(), species: document.getElementById('animal-species').value, tutor_name: t.toUpperCase().trim(), tutor_phone: document.getElementById('tutor-phone').value.trim(), photo_url: photo };
            if (this.currentAnimalId) await db.updateAnimal(this.currentAnimalId, data);
            else await db.addAnimal(data);
            this.closeAnimalModal();
            await this.loadAnimals();
            window.hotelPetApp?.showNotification('Salvo!', 'success');
        } catch (e) { alert('Erro: ' + e.message); }
        finally { window.hotelPetApp?.hideLoading(); }
    }
    handlePhotoUpload(e) {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = ev => { this.currentPhotoBase64 = ev.target.result; document.getElementById('photo-preview').src = ev.target.result; document.getElementById('photo-preview').style.display='block'; document.getElementById('photo-placeholder').style.display='none'; };
        r.readAsDataURL(f);
    }
    openAnimalModal(id=null) {
        this.currentAnimalId=id; this.currentPhotoBase64=null;
        document.getElementById('animal-form').reset();
        document.getElementById('photo-preview').style.display='none';
        document.getElementById('photo-placeholder').style.display='flex';
        if (id) {
            db.getAnimalById(id).then(a => {
                document.getElementById('animal-name').value = a.name;
                document.getElementById('tutor-name').value = a.tutor_name;
                document.getElementById('tutor-phone').value = a.tutor_phone;
                if (a.photo_url) { document.getElementById('photo-preview').src = a.photo_url; document.getElementById('photo-preview').style.display='block'; document.getElementById('photo-placeholder').style.display='none'; this.currentPhotoBase64=a.photo_url; }
            });
        }
        document.getElementById('animal-modal').classList.add('active');
    }
    closeAnimalModal() { document.getElementById('animal-modal').classList.remove('active'); }
    editAnimal(id) { this.openAnimalModal(id); }
    async deleteAnimal(id) { if (confirm('Excluir?')) { await db.deleteAnimal(id); await this.loadAnimals(); } }
    applyFilters() { db.getAnimals(document.getElementById('animal-search').value).then(a => this.renderAnimalsTable(a)); }
}
window.animalsManager = new AnimalsManager();