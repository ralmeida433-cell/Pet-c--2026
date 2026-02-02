class InventoryManager {
    constructor() {
        this.currentProductId = null;
        this.currentSaleId = null;
        this.products = [];
        this.sales = [];
        this.filteredProducts = [];
        this.filteredSales = [];
        this.isInitialized = false;
        this.sortConfig = { column: 'name', direction: 'asc' };
        this.charts = {};

        this.categories = {
            'racao': '🥘 Ração',
            'petiscos': '🦴 Petiscos',
            'brinquedos': '🎾 Brinquedos',
            'higiene': '🛁 Higiene',
            'medicamentos': '💊 Medicamentos',
            'acessorios': '🎀 Acessórios',
            'camas': '🛏️ Camas',
            'coleiras': '🦮 Coleiras'
        };

        this.animalTypes = {
            'dog': { emoji: '🐕', name: 'Cães' },
            'cat': { emoji: '🐱', name: 'Gatos' },
            'bird': { emoji: '🐦', name: 'Aves' },
            'fish': { emoji: '🐠', name: 'Peixes' },
            'rodent': { emoji: '🐹', name: 'Roedores' }
        };

        this.init();
    }

    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeAfterDOM());
        } else {
            this.initializeAfterDOM();
        }
    }

    async initializeAfterDOM() {
        try {
            this.populateFilters();
            this.bindEvents();
            this.setupFormValidation();
            this.setupImageUpload();
            
            if (this.isSectionActive()) {
                await this.loadInventory();
            }
            console.log('Inventory Manager initialized');
        } catch (error) {
            console.warn('Inventory Manager init failed:', error);
        }
    }

    isSectionActive() {
        return document.getElementById('inventory')?.classList.contains('active');
    }

    populateFilters() {
        const catFilter = document.getElementById('category-filter');
        const prodCat = document.getElementById('product-category');
        const animFilter = document.getElementById('animal-filter');
        const prodAnim = document.getElementById('product-animals');

        if (catFilter) {
            catFilter.innerHTML = '<option value="">Todas Categorias</option>' + 
                Object.entries(this.categories).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
        }
        if (prodCat) {
            prodCat.innerHTML = Object.entries(this.categories).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
        }
        if (animFilter) {
            animFilter.innerHTML = '<option value="">Todos Animais</option>' + 
                Object.entries(this.animalTypes).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
        }
        if (prodAnim) {
            prodAnim.innerHTML = Object.entries(this.animalTypes).map(([k, v]) => `<option value="${k}">${v.emoji} ${v.name}</option>`).join('');
        }
    }

    bindEvents() {
        document.getElementById('add-product-btn')?.addEventListener('click', () => this.openProductModal());
        document.getElementById('stock-report-btn')?.addEventListener('click', () => this.generateStockReport());
        document.getElementById('sell-product-btn')?.addEventListener('click', () => this.openSaleModal());

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal && (modal.id === 'product-modal' || modal.id === 'sale-modal')) {
                    this.closeProductModal();
                    this.closeSaleModal();
                }
            });
        });

        document.getElementById('cancel-product')?.addEventListener('click', () => this.closeProductModal());
        document.getElementById('cancel-sale')?.addEventListener('click', () => this.closeSaleModal());

        document.getElementById('product-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        const debounceSearch = this.debounce(() => this.applyFilters(), 300);
        document.getElementById('product-search')?.addEventListener('input', debounceSearch);
        document.getElementById('category-filter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('animal-filter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('stock-status-filter')?.addEventListener('change', () => this.applyFilters());
    }

    // Função que estava faltando
    generateStockReport() {
        if (!this.products || this.products.length === 0) {
            window.hotelPetApp.showNotification('Nenhum produto em estoque para gerar relatório.', 'info');
            return;
        }

        const lowStock = this.products.filter(p => p.currentStock <= p.minStock);
        const totalValue = this.products.reduce((acc, p) => acc + (p.salePrice * p.currentStock), 0);

        const report = `RELATÓRIO DE ESTOQUE - HOTEL PET CÁ\n` +
            `Total de Itens: ${this.products.length}\n` +
            `Itens em Alerta: ${lowStock.length}\n` +
            `Valor Total em Venda: R$ ${totalValue.toFixed(2)}\n\n` +
            `Verifique o console do navegador para detalhes completos.`;

        console.table(this.products);
        window.hotelPetApp.showNotification('Relatório gerado no console do sistema.', 'success');
        alert(report);
    }

    setupImageUpload() {
        const area = document.getElementById('image-upload-area');
        const input = document.getElementById('product-image');
        if (!area || !input) return;

        area.onclick = () => input.click();
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this.showImagePreview(ev.target.result);
                };
                reader.readAsDataURL(file);
            }
        };

        document.getElementById('remove-image')?.addEventListener('click', () => this.removeImage());
    }

    showImagePreview(src) {
        const preview = document.getElementById('image-preview');
        const img = document.getElementById('preview-img');
        const area = document.getElementById('image-upload-area');
        if (preview && img && area) {
            img.src = src;
            preview.style.display = 'block';
            area.style.display = 'none';
        }
    }

    removeImage() {
        const preview = document.getElementById('image-preview');
        const area = document.getElementById('image-upload-area');
        const input = document.getElementById('product-image');
        if (preview && area) {
            preview.style.display = 'none';
            area.style.display = 'block';
            if (input) input.value = '';
        }
    }

    async loadInventory() {
        if (!window.db) return;
        try {
            this.products = await window.db.getProducts?.() || [];
            this.applyFilters();
        } catch (e) {
            console.error('Erro ao carregar estoque:', e);
        }
    }

    applyFilters() {
        const search = document.getElementById('product-search')?.value.toLowerCase() || '';
        const cat = document.getElementById('category-filter')?.value || '';
        const anim = document.getElementById('animal-filter')?.value || '';

        this.filteredProducts = this.products.filter(p => {
            const matchesSearch = !search || p.name.toLowerCase().includes(search);
            const matchesCat = !cat || p.category === cat;
            const matchesAnim = !anim || (p.animals && p.animals.includes(anim));
            return matchesSearch && matchesCat && matchesAnim;
        });

        this.renderProductsTable();
    }

    renderProductsTable() {
        const tbody = document.querySelector('#products-table tbody');
        if (!tbody) return;

        if (this.filteredProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;">Nenhum produto encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredProducts.map(p => `
            <tr>
                <td><img src="${p.imageUrl || ''}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 512 512\'><path fill=\'%23ccc\' d=\'M448 80v352H64V80h384m32-32H32v416h448V48z\'/></svg>'"></td>
                <td><strong>${p.name}</strong></td>
                <td>${this.categories[p.category] || p.category}</td>
                <td>${p.brand || '-'}</td>
                <td>${p.animals ? p.animals.map(a => this.animalTypes[a]?.emoji || '').join(' ') : '-'}</td>
                <td><span class="stock-badge ${p.currentStock <= p.minStock ? 'low-stock' : 'normal-stock'}">${p.currentStock}</span></td>
                <td>R$ ${p.salePrice.toFixed(2)}</td>
                <td>${p.currentStock <= p.minStock ? '<span class="status-badge status-critical">Baixo</span>' : '<span class="status-badge status-normal">Ok</span>'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" onclick="inventoryManager.editProduct('${p.id}')"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" onclick="inventoryManager.deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    openProductModal(id = null) {
        this.currentProductId = id;
        const modal = document.getElementById('product-modal');
        const form = document.getElementById('product-form');
        if (!modal || !form) return;

        form.reset();
        this.removeImage();

        if (id) {
            const p = this.products.find(prod => prod.id === id);
            if (p) {
                document.getElementById('product-name').value = p.name;
                document.getElementById('product-category').value = p.category;
                document.getElementById('product-sale-price').value = p.salePrice;
                document.getElementById('product-current-stock').value = p.currentStock;
                if (p.imageUrl) this.showImagePreview(p.imageUrl);
            }
        }

        modal.classList.add('active');
    }

    closeProductModal() {
        document.getElementById('product-modal')?.classList.remove('active');
    }

    closeSaleModal() {
        document.getElementById('sale-modal')?.classList.remove('active');
    }

    async saveProduct() {
        this.closeProductModal();
        await this.loadInventory();
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    setupFormValidation() {}
}

window.inventoryManager = new InventoryManager();